import { Client, IMessage } from '@stomp/stompjs';

import { addScreenTrackId } from '../store/index.js';
import {
	ClosePeerConnectionProps,
	ConnectPeerConnectionProps,
	createSdpProps,
	RegisterIceProps,
	RegisterSdpProps,
} from '../type/peerConnection.js';
import {
	IceResponseType,
	LeaveResponseType,
	MidResponseType,
	OfferResponseType,
	ScreenTrackResponseType,
} from '../type/signal.js';

import { signalSender } from './signerSender.js';

interface SignalHandlerProps {
	connectPeerConnection: (props: ConnectPeerConnectionProps) => Promise<void>;
	createSdp: (props: createSdpProps) => Promise<RTCSessionDescriptionInit | undefined>;
	registerSdp: (props: RegisterSdpProps) => Promise<void>;
	registerIce: (props: RegisterIceProps) => Promise<void>;
	finalizeMid: (id: string) => void;
	finalizeOtherMid: (id: string, roomId: string) => void;
	closePeerConnection: (props: ClosePeerConnectionProps) => Promise<void>;
}

export const subscribeHandler = ({
	closePeerConnection,
	connectPeerConnection,
	createSdp,
	finalizeMid,
	finalizeOtherMid,
	registerIce,
	registerSdp,
}: SignalHandlerProps) => {
	const parseMessage = <T>(message: IMessage) => {
		const response = JSON.parse(message.body) as T;
		return response;
	};

	const handleOffer = async (client: Client, message: IMessage) => {
		const { sendAnswer } = signalSender({ client });
		const response = parseMessage<OfferResponseType>(message);
		const { roomId, sdp: remoteSdp, userId } = response;
		const parsedRemoteSdp = JSON.parse(remoteSdp) as RTCSessionDescriptionInit;
		await connectPeerConnection({
			roomId,
			userId,
		});
		await registerSdp({ sdp: parsedRemoteSdp, userId });
		const sdp = JSON.stringify(await createSdp({ userId }));
		sendAnswer({ sdp, userId });
	};

	const handleIce = async (message: IMessage) => {
		const { ice, userId } = parseMessage<IceResponseType>(message);
		const parsedIce = JSON.parse(ice) as RTCIceCandidateInit;
		await registerIce({ ice: parsedIce, userId });
	};

	const handleMid = async (message: IMessage) => {
		const { id, roomId } = parseMessage<MidResponseType>(message);
		finalizeMid(id);
		finalizeOtherMid(id, roomId);
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
		handleMid,
		handleOffer,
		handleScreenTrack,
	};
};
