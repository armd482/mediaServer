import WebSocket, { RawData } from 'ws';

import { peerConnectionManager } from '../webrtc/peerConnectionManger.js';

import { subscribeHandler } from './subscriptionHandler.js';

export const initClient = () => {
	const client = new WebSocket('ws://localhost:8080/ws?userId=mediaServer');

	const getRawData = (data: RawData, isBinary: boolean) => {
		if (isBinary) {
			return data.toString('utf-8');
		}

		return data.toString();
	};

	const {
		closePeerConnection,
		createPeerConnection,
		handleNegotiation: negotiation,
		registerIce,
		registerRemoteSdp,
	} = peerConnectionManager({ client });

	const { handleAnswer, handleIce, handleNegotiation, handleParticipant } = subscribeHandler({
		closePeerConnection,
		createPeerConnection,
		negotiation,
		registerIce,
		registerRemoteSdp,
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
			handleNegotiation(payload);
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
