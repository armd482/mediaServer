import { StreamType } from './signal.js';

export type ParticipantType = Record<StreamType, Set<string>>;

export interface TrackType {
	audioTrack: MediaStreamTrack | null;
	videoTrack: MediaStreamTrack | null;
}

export interface TransceiverMidType {
	type: StreamType;
	id: string;
}
