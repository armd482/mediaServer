import { Client, StompSubscription } from '@stomp/stompjs';
import SockJs from 'sockjs-client';

import { signalSubscriber } from './signalSubscriber.js';

export const initClient = () => {
	const onTrack = () => {};
	const onIcecandidate = () => {};

	const { subscribeIce, subscribeOffer } = signalSubscriber({ onIcecandidate, onTrack });
	const subscription = new Map<string, StompSubscription>();

	const client = new Client({
		brokerURL: undefined,
		debug: (str) => console.log('[STOMP]', str),
		onConnect: () => {
			const offerSub = subscribeOffer(client);
			subscription.set('offer', offerSub);

			const iceSub = subscribeIce(client);
			subscription.set('ice', iceSub);

			console.log('connected');
		},
		onDisconnect: () => {
			subscription.forEach((sub) => sub.unsubscribe());
			subscription.clear();
		},
		webSocketFactory: () => new SockJs('http://localhost:8080/ws?userId=mediaServer'),
	});
	console.log('try connecting...');

	client.activate();
};
