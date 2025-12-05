import { StreamType, TrackType } from '../type/media.js';

const mediaStore = new Map<string, TrackType>();
const screenTrackStore = new Set<string>();

export const getMedia = async (userId: string) => {
	const value = {
		audioTrack: null,
		screenAudioTrack: null,
		screenVideoTrack: null,
		videoTrack: null,
	};
	const userMedia = mediaStore.has(userId);
	if (userMedia) {
		return mediaStore.get(userId) ?? value;
	}
	mediaStore.set(userId, value);
	return value;
};

const getKey = (streamType: StreamType, trackKind: string) => {
	if (streamType === 'USER') {
		if (trackKind === 'audio') {
			return 'audioTrack';
		}
		return 'videoTrack';
	}

	if (trackKind === 'audio') {
		return 'screenAudioTrack';
	}
	return 'screenVideoTrack';
};

export const updateMedia = async (userId: string, streamType: StreamType, track: MediaStreamTrack) => {
	const prev = mediaStore.get(userId) ?? {
		audioTrack: null,
		screenAudioTrack: null,
		screenVideoTrack: null,
		videoTrack: null,
	};
	const key = getKey(streamType, track.kind);
	mediaStore.set(userId, { ...prev, [key]: track });
};

export const removeMedia = async (userId: string) => {
	mediaStore.delete(userId);
};

export const isScreenTrack = async (value: string) => screenTrackStore.has(value);

export const addScreenTrack = async (value: string) => {
	screenTrackStore.add(value);
};

export const removeScreenTrack = async (value: string) => {
	screenTrackStore.delete(value);
};
