export type StreamType = 'USER' | 'SCREEN';

interface OfferResponseType {
	userId: string;
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
	userId: string;
	streamType: StreamType;
	sdp: string;
}

export interface IceResponseType {
	userId: string;
	streamType: StreamType;
	ice: string;
}

export interface IcePayloadType extends IceResponseType {}
