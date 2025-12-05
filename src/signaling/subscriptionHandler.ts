import { Client, IMessage } from '@stomp/stompjs';

import {
	ConnectPeerConnectionProps,
	createSdpProps,
	RegisterIceProps,
	RegisterSdpProps,
} from '../type/peerConnection.js';
import { IceResponseType, MidResponseType, OfferResponseType } from '../type/signal.js';

import { signalSender } from './signerSender.js';

interface SignalHandlerProps {
	connectPeerConnection: (props: ConnectPeerConnectionProps) => Promise<void>;
	createSdp: (props: createSdpProps) => Promise<RTCSessionDescriptionInit | undefined>;
	registerSdp: (props: RegisterSdpProps) => Promise<void>;
	registerIce: (props: RegisterIceProps) => Promise<void>;
	finalizeMid: (id: string) => void;
	finalizeOtherMid: (id: string, roomId: string) => void;
}

export const subscribeHandler = ({
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
		const { id, roomId, sdp: remoteSdp } = response;
		const parsedRemoteSdp = JSON.parse(remoteSdp) as RTCSessionDescriptionInit;
		await connectPeerConnection({
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

	const handleMid = async (message: IMessage) => {
		const { id, roomId } = parseMessage<MidResponseType>(message);
		finalizeMid(id);
		finalizeOtherMid(id, roomId);
	};

	return {
		handleIce,
		handleMid,
		handleOffer,
	};
};
