import { Client, StompSubscription } from '@stomp/stompjs';
import SockJs from 'sockjs-client';

import { signalSubscriber } from './signalSubscriber.js';

export const initClient = () => {
	const subscription = new Map<string, StompSubscription>();

	const client = new Client({
		brokerURL: undefined,
		onConnect: () => {
			const { subscribeAnswer, subscribeIce, subscribeLeave, subscribeOffer, subscribeTrack } = signalSubscriber({
				client,
			});
			const offerSub = subscribeOffer();
			subscription.set('offer', offerSub);

			const answerSub = subscribeAnswer();
			subscription.set('answer', answerSub);

			const iceSub = subscribeIce();
			subscription.set('ice', iceSub);

			const trackSub = subscribeTrack();
			subscription.set('track', trackSub);

			const leaveSub = subscribeLeave();
			subscription.set('leave', leaveSub);

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
