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
}

export const subscribeHandler = ({
	connectPeerConnection,
	createSdp,
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
		const { roomId, sdp: remoteSdp, streamType, userId } = response;
		const parsedRemoteSdp = JSON.parse(remoteSdp) as RTCSessionDescriptionInit;
		let ownerId: string | undefined;
		if ('ownerId' in response) {
			ownerId = response.ownerId;
		}
		await connectPeerConnection({
			id: userId,
			ownerId,
			roomId,
			streamType,
		});
		await registerSdp({ id: userId, sdp: parsedRemoteSdp, streamType });
		const sdp = JSON.stringify(await createSdp({ id: userId, streamType }));
		sendAnswer({ client, sdp, streamType, userId });
	};

	const handleIce = async (message: IMessage) => {
		const { ice, streamType, userId } = parseMessage<IceResponseType>(message);
		const parsedIce = JSON.parse(ice) as RTCIceCandidateInit;
		await registerIce({ ice: parsedIce, id: userId, streamType });
	};

	return {
		handleIce,
		handleOffer,
	};
};
