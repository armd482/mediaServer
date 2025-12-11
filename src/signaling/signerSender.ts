import { Client } from '@stomp/stompjs';

import { AnswerPayloadType, IcePayloadType, MidPayloadType, ScreenTrackPayloadType } from '../type/signal.js';

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

	const sendAnswer = (payload: AnswerPayloadType) => {
		sendSignal('/app/signal/answer', payload);
	};

	const sendIce = (payload: IcePayloadType) => {
		sendSignal('/app/signal/ice', payload);
	};

	const sendMid = (payload: MidPayloadType) => {
		sendSignal('', payload);
	};

	const sendScreenTrack = (payload: ScreenTrackPayloadType) => {
		sendSignal('', payload);
	};

	return { sendAnswer, sendIce, sendMid, sendScreenTrack };
};
