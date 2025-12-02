import { Client } from '@stomp/stompjs';

import { peerConnectionManager } from '../webrtc/peerConnectionManger.js';

import { subscribeHandler } from './subscriptionHandler.js';

interface SignalSubscriberProps {
	onTrack: () => void;
	onIcecandidate: () => void;
}

export const signalSubscriber = ({ onIcecandidate, onTrack }: SignalSubscriberProps) => {
	const { connectPeerConnection, createSdp, registerIce, registerSdp } = peerConnectionManager();
	const { handleIce, handleOffer } = subscribeHandler({
		connectPeerConnection,
		createSdp,
		onIcecandidate,
		onTrack,
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
