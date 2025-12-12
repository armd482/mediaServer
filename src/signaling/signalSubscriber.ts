import { Client } from '@stomp/stompjs';

import { peerConnectionManager } from '../webrtc/peerConnectionManger.js';

import { subscribeHandler } from './subscriptionHandler.js';

interface SignalSubscriberProps {
	client: Client;
}

export const signalSubscriber = ({ client }: SignalSubscriberProps) => {
	const { closePeerConnection, connectPeerConnection, createSdp, registerIce, registerLocalSdp, registerSdp } =
		peerConnectionManager({
			client,
		});
	const { handleClosePeerConnection, handleIce, handleOffer, handleScreenTrack } = subscribeHandler({
		closePeerConnection,
		connectPeerConnection,
		createSdp,
		registerIce,
		registerLocalSdp,
		registerSdp,
	});
	const subscribeOffer = () => {
		const sub = client.subscribe('/user/queue/signal/offer', (message) => handleOffer(client, message));
		return sub;
	};

	const subscribeIce = () => {
		const sub = client.subscribe('/user/queue/signal/ice', handleIce);
		return sub;
	};

	const subscribeScreenTrack = () => {
		const sub = client.subscribe('/user/queue/signal/screen', (message) => handleScreenTrack(client, message));
		return sub;
	};

	const subscribeLeave = () => {
		const sub = client.subscribe('/user/queue/signal/leave', handleClosePeerConnection);
		return sub;
	};

	return {
		subscribeIce,
		subscribeLeave,
		subscribeOffer,
		subscribeScreenTrack,
	};
};
