export type ParticipantType = Set<string>;
export type StreamType = 'SCREEN' | 'USER';
export type TrackType = 'audio' | 'video' | 'screenAudio' | 'screenVideo';

export interface TrackInfoType {
	mid?: string;
	userId?: string;
	streamType?: StreamType;
}
