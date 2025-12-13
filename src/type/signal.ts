import { StreamType } from './media.js';

interface SdpPayloadType {
	userId: string;
	sdp: string;
}

export interface OfferPayloadType extends SdpPayloadType {}

export interface OfferResponseType extends SdpPayloadType {
	roomId: string;
}

export interface AnswerPayloadType extends SdpPayloadType {}

export interface AnswerResponseType extends SdpPayloadType {}

export interface IceResponseType {
	userId: string;
	ice: string;
}

export interface IcePayloadType extends IceResponseType {}

export interface TrackResponseType {
	userId: string;
	roomId: string;
	track: Record<string, TrackInfoType>;
}

export interface TrackInfoType {
	userId: string;
	type: StreamType;
}

export interface TrackPayloadType {
	userId: string;
	track: Record<string, TrackInfoType>;
}

export interface LeaveResponseType {
	id: string;
	roomId: string;
}
