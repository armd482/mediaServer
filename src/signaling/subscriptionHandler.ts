import { Client, IMessage } from '@stomp/stompjs';

import { addScreenTrackId, getPeerConnection, updatePeerConnection } from '../store/index.js';
import {
	ClosePeerConnectionProps,
	ConnectPeerConnectionProps,
	createSdpProps,
	RegisterIceProps,
	RegisterLocalSdpProps,
	RegisterSdpProps,
} from '../type/peerConnection.js';
import {
	IcePayloadType,
	IceResponseType,
	LeaveResponseType,
	OfferResponseType,
	ScreenTrackResponseType,
} from '../type/signal.js';

import { signalSender } from './signerSender.js';

interface SignalHandlerProps {
	connectPeerConnection: (props: ConnectPeerConnectionProps) => Promise<void>;
	createSdp: (props: createSdpProps) => Promise<RTCSessionDescriptionInit | undefined>;
	registerLocalSdp: (props: RegisterLocalSdpProps) => Promise<void>;
	registerSdp: (props: RegisterSdpProps) => Promise<void>;
	registerIce: (props: RegisterIceProps) => Promise<void>;
	closePeerConnection: (props: ClosePeerConnectionProps) => Promise<void>;
}

export const subscribeHandler = ({
	closePeerConnection,
	connectPeerConnection,
	createSdp,
	registerIce,
	registerLocalSdp,
}: SignalHandlerProps) => {
	const parseMessage = <T>(message: IMessage) => {
		const response = JSON.parse(message.body) as T;
		return response;
	};

	const handleOffer = async (client: Client, message: IMessage) => {
		const { sendAnswer, sendIce } = signalSender({ client });
		const response = parseMessage<OfferResponseType>(message);
		const { roomId, sdp: remoteSdp, userId } = response;
		const parsedRemoteSdp = JSON.parse(remoteSdp) as RTCSessionDescriptionInit;
		await connectPeerConnection({
			roomId,
			sdp: parsedRemoteSdp,
			userId,
		});
		await new Promise((resolve) => setTimeout(resolve, 100));
		const answerSdp = await createSdp({ userId });
		if (!answerSdp) {
			return;
		}
		await registerLocalSdp({ sdp: answerSdp, userId });
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
		sendAnswer({ sdp: JSON.stringify(answerSdp), userId });
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
		handleClosePeerConnection,
		handleIce,
		handleOffer,
		handleScreenTrack,
	};
};
