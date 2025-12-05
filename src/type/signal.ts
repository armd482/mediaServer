import { TransceiverMidType } from './media.js';

export interface OfferResponseType {
	userId: string;
	sdp: string;
	roomId: string;
}

export interface AnswerPayloadType {
	userId: string;
	sdp: string;
}

export interface IceResponseType {
	userId: string;
	ice: string;
}

export interface IcePayloadType extends IceResponseType {}

export interface MidPayloadType {
	id: string;
	mid: Record<string, TransceiverMidType>;
}

export interface MidResponseType {
	id: string;
	roomId: string;
}

export interface ScreenTrackResponseType {
	id: string;
	trackId: string;
}

export interface ScreenTrackPayloadType {
	id: string;
	trackId: string;
}

export interface LeaveResponseType {
	id: string;
	roomId: string;
}
