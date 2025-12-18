import { TrackType } from './media.js';

interface SdpPayloadType {
	userId: string;
	sdp: string;
}

export interface ParticipantResponseType {
	userId: string;
	roomId: string;
}

export interface OfferPayloadType extends SdpPayloadType {
	trackInfo: Record<string, TrackInfoType>;
}

export interface OfferResponseType extends SdpPayloadType {
	roomId: string;
	trackInfo: Record<string, TrackInfoType>;
}

export interface AnswerPayloadType extends SdpPayloadType {}

export interface AnswerResponseType extends SdpPayloadType {
	roomId: string;
	trackInfo: Record<string, TrackInfoType>;
}

export interface IceResponseType {
	userId: string;
	ice: string;
}

export interface IcePayloadType extends IceResponseType {}

export interface NegotiationResponseType {
	userId: string;
}

export interface TrackResponseType {
	userId: string;
	trackInfo: Record<string, TrackInfoType>;
}

type Mid = string;

export interface TrackResponseType {
	userId: string;
	roomId: string;
	transceiver: Record<Mid, TrackInfoType>;
}

export interface TrackInfoType {
	userId: string;
	trackType: TrackType;
}

export interface TrackPayloadType {
	userId: string;
	transceiver: Record<Mid, TrackInfoType>;
}

export interface LeaveResponseType {
	id: string;
	roomId: string;
}
