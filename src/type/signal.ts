import { Client } from '@stomp/stompjs';

import { PeerConnectionInit } from './peerConnection.js';

export type StreamType = 'USER' | 'SCREEN';

interface OfferResponseType {
	userId: string;
	sdp: string;
}

export interface UserOfferResponseType extends OfferResponseType {
	streamType: 'USER';
}

export interface ScreenOfferResponseType extends OfferResponseType {
	streamType: 'SCREEN';
	ownerId: string;
}

export interface IceResponseType {
	userId: string;
	streamType: StreamType;
	ice: string;
}

export interface SendAnswerProps extends PeerConnectionInit {
	sdp: string;
	client: Client;
}

export interface AnswerPayloadType {
	userId: string;
	streamType: StreamType;
	sdp: string;
}
