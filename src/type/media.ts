export type ParticipantType = Set<string>;
export type StreamType = 'SCREEN' | 'USER';

export interface TrackType {
	audio: MediaStreamTrack | null;
	video: MediaStreamTrack | null;
	screenAudio: MediaStreamTrack | null;
	screenVideo: MediaStreamTrack | null;
}

export interface PendingTrackEntry {
	mid?: string;
	track?: MediaStreamTrack;
	userId?: string;
	streamType?: StreamType;
}
