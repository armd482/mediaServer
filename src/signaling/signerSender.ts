import WebSocket from 'ws';

import { AnswerPayloadType, IcePayloadType, OfferPayloadType, TrackPayloadType } from '../type/signal.js';

interface SignalSenderProps {
	client: WebSocket;
}

export const signalSender = ({ client }: SignalSenderProps) => {
	const sendSignal = <T>(path: string, payload: T) => {
		client.send(
			Buffer.from(
				JSON.stringify({
					path,
					payload,
					type: 'signal',
				}),
			),
		);
	};

	const sendOffer = (payload: OfferPayloadType) => {
		sendSignal('OFFER', payload);
	};

	const sendAnswer = (payload: AnswerPayloadType) => {
		sendSignal('ANSWER', payload);
	};

	const sendIce = (payload: IcePayloadType) => {
		sendSignal('ICE', payload);
	};

	const sendTrack = (payload: TrackPayloadType) => {
		sendSignal('TRACK', payload);
	};

	return { sendAnswer, sendIce, sendOffer, sendTrack };
};
