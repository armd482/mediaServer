import { TransceiverMidType } from './media.js';

export type StreamType = 'USER' | 'SCREEN';

interface OfferResponseType {
	id: string;
	sdp: string;
	roomId: string;
}

export interface UserOfferResponseType extends OfferResponseType {
	streamType: 'USER';
}

export interface ScreenOfferResponseType extends OfferResponseType {
	streamType: 'SCREEN';
	ownerId: string;
}

export interface AnswerPayloadType {
	id: string;
	streamType: StreamType;
	sdp: string;
}

export interface IceResponseType {
	id: string;
	streamType: StreamType;
	ice: string;
}

export interface IcePayloadType extends IceResponseType {}

export interface MidPayloadType {
	id: string;
	mid: Record<string, TransceiverMidType>;
}
