export type ParticipantType = Set<string>;
export type StreamType = 'SCREEN' | 'USER';

export interface TrackType {
	audioTrack: MediaStreamTrack | null;
	videoTrack: MediaStreamTrack | null;
	screenAudioTrack: MediaStreamTrack | null;
	screenVideoTrack: MediaStreamTrack | null;
}

export interface PendingTrackEntry {
	track?: MediaStreamTrack;
	streamType?: StreamType;
}
