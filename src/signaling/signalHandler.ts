import { IMessage } from '@stomp/stompjs';

import {
	ConnectPeerConnectionProps,
	createSdpProps,
	RegisterIceProps,
	RegisterSdpProps,
} from '../type/peerConnection.js';
import { IceResponseType, ScreenOfferResponseType, UserOfferResponseType } from '../type/signal.js';

interface SignalHandlerProps {
	connectPeerConnection: (props: ConnectPeerConnectionProps) => void;
	createSdp: (props: createSdpProps) => Promise<void>;
	registerSdp: (props: RegisterSdpProps) => Promise<void>;
	registerIce: (props: RegisterIceProps) => void;
	onTrack: () => void;
	onIcecandidate: () => void;
	sendAnswer: (userId: string, streamType: string, sdp: string) => void;
}

export const signalHandler = ({
	connectPeerConnection,
	createSdp,
	onIcecandidate,
	onTrack,
	registerIce,
	registerSdp,
	sendAnswer,
}: SignalHandlerProps) => {
	const parseMessage = <T>(message: IMessage) => {
		const response = JSON.parse(message.body) as T;
		return response;
	};

	const handleOffer = async (message: IMessage) => {
		const response = parseMessage<ScreenOfferResponseType | UserOfferResponseType>(message);
		const { sdp: remoteSdp, streamType, userId } = response;
		const parsedRemoteSdp = JSON.parse(remoteSdp) as RTCSessionDescriptionInit;
		connectPeerConnection({ onIcecandidate, onTrack, streamType, userId });
		await registerSdp({ sdp: parsedRemoteSdp, streamType, userId });
		const sdp = JSON.stringify(await createSdp({ streamType, userId }));
		sendAnswer(userId, streamType, sdp);
	};

	const HandleIce = async (message: IMessage) => {
		const { ice, streamType, userId } = parseMessage<IceResponseType>(message);
		const parsedIce = JSON.parse(ice) as RTCIceCandidateInit;
		registerIce({ ice: parsedIce, streamType, userId });
	};

	return {
		HandleIce,
		handleOffer,
	};
};
