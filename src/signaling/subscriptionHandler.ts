import WebSocket from 'ws';

import {
	deletePendingTrack,
	getPeerConnection,
	getPendingTrack,
	getTransceiver,
	setPendingTrack,
	setTransceiver,
	updatePeerConnection,
} from '../store/index.js';
import { PendingTrackEntry, StreamType } from '../type/media.js';
import {
	ClosePeerConnectionProps,
	CreatePeerConnectionProps,
	CreateSdpProps,
	DeviceTransceiverType,
	RegisterIceProps,
	RegisterLocalSdpProps,
	RegisterRemoteSdpProps,
} from '../type/peerConnection.js';
import {
	AnswerResponseType,
	IcePayloadType,
	IceResponseType,
	LeaveResponseType,
	OfferResponseType,
	TrackInfoType,
	TrackPayloadType,
	TrackResponseType,
} from '../type/signal.js';

import { signalSender } from './signerSender.js';

interface SignalHandlerProps {
	createPeerConnection: (props: CreatePeerConnectionProps) => Promise<RTCPeerConnection>;
	createAnswerSdp: (props: CreateSdpProps) => Promise<RTCSessionDescriptionInit | undefined>;
	registerLocalSdp: (props: RegisterLocalSdpProps) => Promise<void>;
	registerRemoteSdp: (props: RegisterRemoteSdpProps) => Promise<void>;
	registerOwnerTrack: (id: string, roomId: string, track: MediaStreamTrack, streamType: StreamType) => Promise<void>;
	registerIce: (props: RegisterIceProps) => Promise<void>;
	closePeerConnection: (props: ClosePeerConnectionProps) => Promise<void>;
}

export const subscribeHandler = ({
	closePeerConnection,
	createAnswerSdp,
	createPeerConnection,
	registerIce,
	registerLocalSdp,
	registerOwnerTrack,
	registerRemoteSdp,
}: SignalHandlerProps) => {
	const sendIceQueue = async (userId: string, client: WebSocket) => {
		const { sendIce } = signalSender({ client });
		const data = await getPeerConnection(userId);
		if (data) {
			await updatePeerConnection(userId, { remoteSet: true });
			const { iceQueue } = data;
			iceQueue.forEach((ice) => {
				const payload: IcePayloadType = {
					ice: JSON.stringify(ice),
					userId,
				};
				sendIce(payload);
			});
			await updatePeerConnection(userId, { iceQueue: [] });
		}
	};

	const handleOffer = async (client: WebSocket, response: OfferResponseType) => {
		console.log('getOffer');
		const { sendAnswer } = signalSender({ client });
		const { roomId, sdp: remoteSdp, userId } = response;
		const parsedRemoteSdp = JSON.parse(remoteSdp) as RTCSessionDescriptionInit;

		await createPeerConnection({
			roomId,
			userId,
		});

		await registerRemoteSdp({ sdp: parsedRemoteSdp, userId });
		const answerSdp = await createAnswerSdp({ userId });
		if (!answerSdp) {
			return;
		}
		await sendIceQueue(userId, client);
		sendAnswer({ sdp: JSON.stringify(answerSdp), userId });

		await registerLocalSdp({ sdp: answerSdp, userId });
		await updatePeerConnection(userId, { makingOffer: false });
	};

	const handleAnswer = async (client: WebSocket, response: AnswerResponseType) => {
		const { sdp, userId } = response;
		const parsedRemoteSdp = JSON.parse(sdp) as RTCSessionDescriptionInit;
		await registerRemoteSdp({ sdp: parsedRemoteSdp, userId });
		await sendIceQueue(userId, client);

		const { sendTrack } = signalSender({ client });

		const transceiverData = new Map<string, TrackInfoType>();

		const transceiver = (await getTransceiver(userId)) as undefined | Map<string, DeviceTransceiverType>;

		if (!transceiver) {
			return;
		}

		transceiver.forEach(async (transceiverType, fromUserId) => {
			Object.entries(transceiverType).forEach(async ([type, t]) => {
				if (t) {
					transceiverData.set(t.mid as string, {
						streamType: type === 'audio' || type === 'video' ? 'USER' : 'SCREEN',
						userId: fromUserId,
					});
					await setTransceiver(userId, fromUserId, { [type]: null });
				}
			});
		});
		if (transceiverData.size === 0) {
			return;
		}

		const payload: TrackPayloadType = {
			transceiver: Object.fromEntries(transceiverData),
			userId,
		};

		sendTrack(payload);
	};

	const handleIce = async (response: IceResponseType) => {
		const { ice, userId } = response;
		const parsedIce = JSON.parse(ice) as RTCIceCandidateInit;
		await registerIce({ ice: parsedIce, userId });
	};

	const handleTrack = async (response: TrackResponseType) => {
		const { roomId, transceiver, userId } = response;
		await Promise.all(
			Object.entries(transceiver).map(async ([mid, { streamType }]) => {
				const entry = (await getPendingTrack(userId, mid)) as PendingTrackEntry | undefined;
				if (entry?.track) {
					await deletePendingTrack(userId, mid);
					await registerOwnerTrack(userId, roomId, entry.track, streamType);
					return;
				}
				await setPendingTrack(userId, mid, { streamType });
			}),
		);
	};

	const handleClosePeerConnection = async (response: LeaveResponseType) => {
		const { id, roomId } = response;
		await closePeerConnection({ id, roomId });
	};

	return {
		handleAnswer,
		handleClosePeerConnection,
		handleIce,
		handleOffer,
		handleTrack,
	};
};
