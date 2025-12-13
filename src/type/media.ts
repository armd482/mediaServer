export type ParticipantType = Set<string>;
export type StreamType = 'SCREEN' | 'USER';

export interface TrackType {
	audioTrack: MediaStreamTrack | null;
	videoTrack: MediaStreamTrack | null;
	screenAudioTrack: MediaStreamTrack | null;
	screenVideoTrack: MediaStreamTrack | null;
	mediaStream: MediaStream | null;
}

export interface TransceiverMidType {
	id: string;
	type: StreamType;
}

export type TransceiverType = Record<'audio' | 'video' | 'screenAudio' | 'screenVideo', RTCRtpTransceiver | null>;

export interface PendingTrackEntry {
	track?: MediaStreamTrack;
	stream?: MediaStream;
	type?: StreamType;
}
