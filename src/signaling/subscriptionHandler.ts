import { Client, IMessage } from '@stomp/stompjs';

import {
	ConnectPeerConnectionProps,
	createSdpProps,
	RegisterIceProps,
	RegisterSdpProps,
} from '../type/peerConnection.js';
import { IceResponseType, OfferResponseType } from '../type/signal.js';

import { signalSender } from './signerSender.js';

interface SignalHandlerProps {
	connectPeerConnection: (props: ConnectPeerConnectionProps) => Promise<void>;
	createSdp: (props: createSdpProps) => Promise<RTCSessionDescriptionInit>;
	registerSdp: (props: RegisterSdpProps) => Promise<void>;
	registerIce: (props: RegisterIceProps) => Promise<void>;
}

export const subscribeHandler = ({
	connectPeerConnection,
	createSdp,
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
		const { id, roomId, sdp: remoteSdp } = response;
		const parsedRemoteSdp = JSON.parse(remoteSdp) as RTCSessionDescriptionInit;
		await connectPeerConnection({
			client,
			id,
			roomId,
		});
		await registerSdp({ id, sdp: parsedRemoteSdp });
		const sdp = JSON.stringify(await createSdp({ id }));
		sendAnswer({ id, sdp });
	};

	const handleIce = async (message: IMessage) => {
		const { ice, id } = parseMessage<IceResponseType>(message);
		const parsedIce = JSON.parse(ice) as RTCIceCandidateInit;
		await registerIce({ ice: parsedIce, id });
	};

	return {
		handleIce,
		handleOffer,
	};
};
