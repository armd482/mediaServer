import WebSocket from 'ws';

import { signalSender } from '@/signaling/signerSender.js';
import { addParticipant, getPeerConnection, updatePeerConnection, updateUserTrackInfo } from '@/store/index.js';
import {
	ClosePeerConnectionProps,
	CreatePeerConnectionProps,
	RegisterIceProps,
	RegisterRemoteSdpProps,
} from '@/type/peerConnection.js';
import {
	ParticipantResponseType,
	AnswerResponseType,
	IceResponseType,
	LeaveResponseType,
	IcePayloadType,
} from '@/type/signal.js';

interface SignalHandlerProps {
	closePeerConnection: (props: ClosePeerConnectionProps) => Promise<void>;
	createPeerConnection: (props: CreatePeerConnectionProps) => Promise<RTCPeerConnection>;
	registerRemoteIce: (props: RegisterIceProps) => Promise<void>;
	registerAnswerSdp: (props: RegisterRemoteSdpProps) => Promise<void>;
}

export const subscribeHandler = ({
	closePeerConnection,
	createPeerConnection,
	registerAnswerSdp,
	registerRemoteIce,
}: SignalHandlerProps) => {
	const handleParticipant = async (response: ParticipantResponseType) => {
		const { roomId, userId } = response;

		await createPeerConnection({
			roomId,
			userId,
		});

		await addParticipant(roomId, userId);
	};

	const handleAnswer = async (client: WebSocket, response: AnswerResponseType) => {
		const { sdp, trackInfo, userId } = response;
		const parsedRemoteSdp = JSON.parse(sdp) as RTCSessionDescriptionInit;
		await Promise.all(
			Object.entries(trackInfo).map(async ([mid, track]) => {
				await updateUserTrackInfo(userId, mid, track);
			}),
		);

		await registerAnswerSdp({ sdp: parsedRemoteSdp, userId });
		const data = await getPeerConnection(userId);
		if (!data) {
			return;
		}

		await updatePeerConnection(userId, { iceQueue: [], makingOffer: false, remoteSet: true });

		const { sendIce } = signalSender({ client });

		data.iceQueue.forEach((ice) => {
			const payload: IcePayloadType = {
				ice: JSON.stringify(ice),
				userId,
			};
			sendIce(payload);
		});
	};

	const handleIce = async (response: IceResponseType) => {
		const { ice, userId } = response;
		const parsedIce = JSON.parse(ice) as RTCIceCandidateInit;
		await registerRemoteIce({ ice: parsedIce, userId });
	};

	const handleLeave = async (response: LeaveResponseType) => {
		const { roomId, userId } = response;
		await closePeerConnection({ roomId, userId });
	};

	return {
		handleAnswer,
		handleIce,
		handleLeave,
		handleParticipant,
	};
};
