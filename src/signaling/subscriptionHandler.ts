import WebSocket from 'ws';

import { addParticipant, getPeerConnection, updatePeerConnection, updateUserTrackInfo } from '../store/index.js';
import {
	ClosePeerConnectionProps,
	CreatePeerConnectionProps,
	RegisterIceProps,
	RegisterRemoteSdpProps,
} from '../type/peerConnection.js';
import {
	ParticipantResponseType,
	AnswerResponseType,
	IceResponseType,
	LeaveResponseType,
	NegotiationResponseType,
	IcePayloadType,
} from '../type/signal.js';

import { signalSender } from './signerSender.js';

interface SignalHandlerProps {
	closePeerConnection: (props: ClosePeerConnectionProps) => Promise<void>;
	createPeerConnection: (props: CreatePeerConnectionProps) => Promise<RTCPeerConnection>;
	negotiation: (userId: string) => Promise<void>;
	registerIce: (props: RegisterIceProps) => Promise<void>;
	registerRemoteSdp: (props: RegisterRemoteSdpProps) => Promise<void>;
}

export const subscribeHandler = ({
	closePeerConnection,
	createPeerConnection,
	negotiation,
	registerIce,
	registerRemoteSdp,
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
		console.log('getAnswer');
		const { sdp, trackInfo, userId } = response;
		Object.entries(trackInfo).forEach((value) => console.log(value));
		const parsedRemoteSdp = JSON.parse(sdp) as RTCSessionDescriptionInit;
		await Promise.all(
			Object.entries(trackInfo).map(async ([mid, track]) => {
				console.log(mid, track);
				await updateUserTrackInfo(userId, mid, track);
			}),
		);

		await registerRemoteSdp({ sdp: parsedRemoteSdp, userId });
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
		await registerIce({ ice: parsedIce, userId });
	};

	const handleLeave = async (response: LeaveResponseType) => {
		const { id, roomId } = response;
		await closePeerConnection({ id, roomId });
	};

	const handleNegotiation = async (response: NegotiationResponseType) => {
		const { userId } = response;
		await negotiation(userId);
	};

	return {
		handleAnswer,
		handleIce,
		handleLeave,
		handleNegotiation,
		handleParticipant,
	};
};
