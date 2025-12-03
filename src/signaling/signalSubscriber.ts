import { Client } from '@stomp/stompjs';

import { peerConnectionManager } from '../webrtc/peerConnectionManger.js';

import { subscribeHandler } from './subscriptionHandler.js';

export const signalSubscriber = () => {
	const { connectPeerConnection, createSdp, registerIce, registerSdp } = peerConnectionManager();
	const { handleIce, handleOffer } = subscribeHandler({
		connectPeerConnection,
		createSdp,
		registerIce,
		registerSdp,
	});
	const subscribeOffer = (client: Client) => {
		const sub = client.subscribe('offer', (message) => handleOffer(client, message));
		return sub;
	};

	const subscribeIce = (client: Client) => {
		const sub = client.subscribe('ice', handleIce);
		return sub;
	};

	return {
		subscribeIce,
		subscribeOffer,
	};
};
