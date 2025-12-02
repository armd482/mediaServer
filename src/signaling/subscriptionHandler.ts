import { Client, IMessage } from '@stomp/stompjs';

import {
	ConnectPeerConnectionProps,
	createSdpProps,
	RegisterIceProps,
	RegisterSdpProps,
} from '../type/peerConnection.js';
import { IceResponseType, ScreenOfferResponseType, UserOfferResponseType } from '../type/signal.js';

import { signalSender } from './signerSender.js';

interface SignalHandlerProps {
	connectPeerConnection: (props: ConnectPeerConnectionProps) => Promise<void>;
	createSdp: (props: createSdpProps) => Promise<RTCSessionDescriptionInit>;
	registerSdp: (props: RegisterSdpProps) => Promise<void>;
	registerIce: (props: RegisterIceProps) => Promise<void>;
	onTrack: () => void;
	onIcecandidate: () => void;
}

export const subscribeHandler = ({
	connectPeerConnection,
	createSdp,
	onIcecandidate,
	onTrack,
	registerIce,
	registerSdp,
}: SignalHandlerProps) => {
	const { sendAnswer } = signalSender();
	const parseMessage = <T>(message: IMessage) => {
		const response = JSON.parse(message.body) as T;
		return response;
	};

	const handleOffer = async (client: Client, message: IMessage) => {
		const response = parseMessage<ScreenOfferResponseType | UserOfferResponseType>(message);
		const { sdp: remoteSdp, streamType, userId } = response;
		const parsedRemoteSdp = JSON.parse(remoteSdp) as RTCSessionDescriptionInit;
		await connectPeerConnection({ onIcecandidate, onTrack, streamType, userId });
		await registerSdp({ sdp: parsedRemoteSdp, streamType, userId });
		const sdp = JSON.stringify(await createSdp({ streamType, userId }));
		sendAnswer({ client, sdp, streamType, userId });
	};

	const handleIce = async (message: IMessage) => {
		const { ice, streamType, userId } = parseMessage<IceResponseType>(message);
		const parsedIce = JSON.parse(ice) as RTCIceCandidateInit;
		await registerIce({ ice: parsedIce, streamType, userId });
	};

	return {
		handleIce,
		handleOffer,
	};
};
