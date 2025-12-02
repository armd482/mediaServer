import { Client } from '@stomp/stompjs';

import { AnswerPayloadType, SendAnswerProps } from '../type/signal.js';

export const signalSender = () => {
	const sendSignal = <T>(client: Client, destination: string, payload: T) => {
		client.publish({
			body: JSON.stringify(payload),
			destination,
			headers: {
				'content-type': 'application/json',
			},
		});
	};

	const sendAnswer = (props: SendAnswerProps) => {
		const { client, ...response } = props;
		sendSignal<AnswerPayloadType>(client, '', response);
	};

	return { sendAnswer };
};
