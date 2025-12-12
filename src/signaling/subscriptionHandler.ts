import { Client, IMessage } from '@stomp/stompjs';

import { addScreenTrackId, getPeerConnection, updatePeerConnection } from '../store/index.js';
import {
	ClosePeerConnectionProps,
	ConnectPeerConnectionProps,
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
	ScreenTrackResponseType,
} from '../type/signal.js';

import { signalSender } from './signerSender.js';

interface SignalHandlerProps {
	connectPeerConnection: (props: ConnectPeerConnectionProps) => Promise<void>;
	createSdp: (props: CreateSdpProps) => Promise<RTCSessionDescriptionInit | undefined>;
	registerLocalSdp: (props: RegisterLocalSdpProps) => Promise<void>;
	registerRemoteSdp: (props: RegisterRemoteSdpProps) => Promise<void>;
	registerIce: (props: RegisterIceProps) => Promise<void>;
	closePeerConnection: (props: ClosePeerConnectionProps) => Promise<void>;
}

export const subscribeHandler = ({
	closePeerConnection,
	connectPeerConnection,
	createSdp,
	registerIce,
	registerLocalSdp,
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
		await connectPeerConnection({
			roomId,
			sdp: parsedRemoteSdp,
			userId,
		});
		const answerSdp = await createSdp({ userId });
		if (!answerSdp) {
			return;
		}
		await registerLocalSdp({ sdp: answerSdp, userId });
		await sendIceQueue(userId, client);
		sendAnswer({ sdp: JSON.stringify(answerSdp), userId });
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

	const handleScreenTrack = async (client: Client, message: IMessage) => {
		const { sendScreenTrack } = signalSender({ client });
		const { id, trackId } = parseMessage<ScreenTrackResponseType>(message);
		await addScreenTrackId(trackId);
		sendScreenTrack({ id, trackId });
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
		handleScreenTrack,
	};
};
