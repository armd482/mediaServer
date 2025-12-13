import { Client } from '@stomp/stompjs';

import { AnswerPayloadType, IcePayloadType, OfferPayloadType, TrackPayloadType } from '../type/signal.js';

interface SignalSenderProps {
	client: Client;
}

export const signalSender = ({ client }: SignalSenderProps) => {
	const sendSignal = <T>(destination: string, payload: T) => {
		client.publish({
			body: JSON.stringify(payload),
			destination,
			headers: {
				'content-type': 'application/json',
			},
		});
	};

	const sendOffer = (payload: OfferPayloadType) => {
		sendSignal('/app/signal/offer', payload);
	};

	const sendAnswer = (payload: AnswerPayloadType) => {
		sendSignal('/app/signal/answer', payload);
	};

	const sendIce = (payload: IcePayloadType) => {
		sendSignal('/app/signal/ice', payload);
	};

	const sendTrack = (payload: TrackPayloadType) => {
		sendSignal('/app/signal/track', payload);
	};

	return { sendAnswer, sendIce, sendOffer, sendTrack };
};
