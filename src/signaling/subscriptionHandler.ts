import { Client, IMessage } from '@stomp/stompjs';

import {
	deletePendingTrack,
	getPeerConnection,
	getPendingTrack,
	setPendingTrack,
	updatePeerConnection,
} from '../store/index.js';
import { StreamType } from '../type/media.js';
import {
	ClosePeerConnectionProps,
	CreatePeerConnectionProps,
	CreateSdpProps,
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
	TrackResponseType,
} from '../type/signal.js';

import { signalSender } from './signerSender.js';

interface SignalHandlerProps {
	createPeerConnection: (props: CreatePeerConnectionProps) => Promise<RTCPeerConnection>;
	createAnswerSdp: (props: CreateSdpProps) => Promise<RTCSessionDescriptionInit | undefined>;
	registerLocalSdp: (props: RegisterLocalSdpProps) => Promise<void>;
	registerRemoteSdp: (props: RegisterRemoteSdpProps) => Promise<void>;
	registerOwnerTrack: (
		id: string,
		roomId: string,
		track: MediaStreamTrack,
		mediaStream: MediaStream,
		streamType: StreamType,
	) => Promise<void>;
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
	const parseMessage = <T>(message: IMessage) => {
		const response = JSON.parse(message.body) as T;
		return response;
	};

	const sendIceQueue = async (userId: string, client: Client) => {
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

	const handleOffer = async (client: Client, message: IMessage) => {
		const { sendAnswer } = signalSender({ client });
		const response = parseMessage<OfferResponseType>(message);
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

	const handleAnswer = async (client: Client, message: IMessage) => {
		const { sdp, userId } = parseMessage<AnswerResponseType>(message);
		const parsedRemoteSdp = JSON.parse(sdp) as RTCSessionDescriptionInit;
		await registerRemoteSdp({ sdp: parsedRemoteSdp, userId });
		await sendIceQueue(userId, client);
	};

	const handleIce = async (message: IMessage) => {
		const { ice, userId } = parseMessage<IceResponseType>(message);
		const parsedIce = JSON.parse(ice) as RTCIceCandidateInit;
		await registerIce({ ice: parsedIce, userId });
	};

	const handleTrack = async (message: IMessage) => {
		const { roomId, track, userId } = parseMessage<TrackResponseType>(message);
		await Promise.all(
			Object.entries(track).map(async ([trackId, { type }]) => {
				const entry = await getPendingTrack(trackId);
				if (entry?.track && entry?.stream) {
					await deletePendingTrack(trackId);
					await registerOwnerTrack(userId, roomId, entry.track, entry.stream, type);
					return;
				}
				await setPendingTrack(trackId, { type });
			}),
		);
	};

	const handleClosePeerConnection = async (message: IMessage) => {
		const { id, roomId } = parseMessage<LeaveResponseType>(message);
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
