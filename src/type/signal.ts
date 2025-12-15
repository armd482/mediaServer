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

export interface AnswerResponseType extends SdpPayloadType {
	roomId: string;
}

export interface IceResponseType {
	userId: string;
	ice: string;
}

export interface IcePayloadType extends IceResponseType {}

type Mid = string;

export interface TrackResponseType {
	userId: string;
	roomId: string;
	transceiver: Record<Mid, TrackInfoType>;
}

export interface TrackInfoType {
	userId: string;
	streamType: StreamType;
}

export interface TrackPayloadType {
	userId: string;
	transceiver: Record<Mid, TrackInfoType>;
}

export interface LeaveResponseType {
	id: string;
	roomId: string;
}
