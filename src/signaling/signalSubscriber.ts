import { Client } from '@stomp/stompjs';

import { peerConnectionManager } from '../webrtc/peerConnectionManger.js';

import { subscribeHandler } from './subscriptionHandler.js';

interface SignalSubscriberProps {
	client: Client;
}

export const signalSubscriber = ({ client }: SignalSubscriberProps) => {
	const { connectPeerConnection, createSdp, finalizeMid, finalizeOtherMid, registerIce, registerSdp } =
		peerConnectionManager({ client });
	const { handleIce, handleMid, handleOffer } = subscribeHandler({
		connectPeerConnection,
		createSdp,
		finalizeMid,
		finalizeOtherMid,
		registerIce,
		registerSdp,
	});
	const subscribeOffer = () => {
		const sub = client.subscribe('offer', (message) => handleOffer(client, message));
		return sub;
	};

	const subscribeIce = () => {
		const sub = client.subscribe('ice', handleIce);
		return sub;
	};

	const subscribeMid = () => {
		const sub = client.subscribe('mid', handleMid);
		return sub;
	};

	return {
		subscribeIce,
		subscribeMid,
		subscribeOffer,
	};
};
