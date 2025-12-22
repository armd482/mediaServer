import WebSocket, { RawData } from 'ws';

import { subscribeHandler } from './subscriptionHandler.js';

import { peerConnectionManager } from '@/webrtc/peerConnectionManger.js';

export const initClient = () => {
	const client = new WebSocket('ws://localhost:8080/ws?userId=mediaServer');

	const getRawData = (data: RawData, isBinary: boolean) => {
		if (isBinary) {
			return data.toString('utf-8');
		}

		return data.toString();
	};

	const { closePeerConnection, createPeerConnection, handleNegotiation, registerAnswerSdp, registerRemoteIce } =
		peerConnectionManager({ client });

	const { handleAnswer, handleIce, handleParticipant } = subscribeHandler({
		closePeerConnection,
		createPeerConnection,
		registerAnswerSdp,
		registerRemoteIce,
	});

	client.on('message', (data, isBinary) => {
		const rawData = getRawData(data, isBinary);
		const { path, payload } = JSON.parse(rawData);

		if (path === 'PARTICIPANT') {
			handleParticipant(payload);
			return;
		}

		if (path === 'ANSWER') {
			handleAnswer(client, payload);
			return;
		}

		if (path === 'ICE') {
			handleIce(payload);
			return;
		}

		if (path === 'NEGOTIATION') {
			handleNegotiation(payload.userId);
			return;
		}
	});

	client.on('error', () => {
		console.log('error');
	});

	client.on('close', () => {
		console.log('close');
	});

	console.log('try connecting...');
};
