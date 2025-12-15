import { StreamType, TrackType, PendingTrackEntry } from '../type/media.js';
import { getTrackType } from '../util/trackType.js';

const mediaStore = new Map<string, TrackType>();
const pendingTracksStore = new Map<string, Map<string, PendingTrackEntry>>(); // userId, mid -> Track

export const getMedia = async (userId: string) => {
	const value = {
		audio: null,
		screenAudio: null,
		screenVideo: null,
		video: null,
	};
	const userMedia = mediaStore.has(userId);
	if (userMedia) {
		return mediaStore.get(userId) ?? value;
	}
	mediaStore.set(userId, value);
	return value;
};

export const updateMedia = async (userId: string, streamType: StreamType, track: MediaStreamTrack) => {
	const prev: TrackType = mediaStore.get(userId) ?? {
		audio: null,
		screenAudio: null,
		screenVideo: null,
		video: null,
	};
	const key = getTrackType(streamType, track.kind);
	mediaStore.set(userId, { ...prev, [key]: track });
};

export const removeTrack = async (userId: string, streamType: StreamType, trackKind: string) => {
	const key = getTrackType(streamType, trackKind);
	const prev = mediaStore.get(userId);
	if (!prev) {
		return;
	}
	mediaStore.set(userId, { ...prev, [key]: null });
};

export const removeMedia = async (userId: string) => {
	mediaStore.delete(userId);
};

export const getPendingTrackStore = async (userId: string, trackId?: string) => {
	if (trackId) {
		return pendingTracksStore.get(userId)?.get(trackId);
	}
	return pendingTracksStore.get(userId);
};
export const setPendingTrackStore = async (userId: string, trackId: string, value: Partial<PendingTrackEntry>) => {
	if (!pendingTracksStore.get(userId)) {
		pendingTracksStore.set(userId, new Map());
	}

	const prev = pendingTracksStore.get(userId)?.get(trackId) ?? {};

	pendingTracksStore.get(userId)?.set(trackId, { ...prev, ...value });
};

export const deletePendingTrackStore = async (userId: string, trackId: string) => {
	const pendingTracks = pendingTracksStore.get(userId);
	if (!pendingTracks) {
		return;
	}
	pendingTracks.delete(trackId);
	if (pendingTracks.size === 0) {
		pendingTracksStore.delete(userId);
	}
};
