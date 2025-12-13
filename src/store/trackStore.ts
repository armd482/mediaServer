import { StreamType, TrackType, PendingTrackEntry } from '../type/media.js';

const mediaStore = new Map<string, TrackType>();
const pendingTracksStore = new Map<string, PendingTrackEntry>();

export const getMedia = async (userId: string) => {
	const value = {
		audioTrack: null,
		mediaStream: null,
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

export const updateMedia = async (
	userId: string,
	streamType: StreamType,
	track: MediaStreamTrack,
	mediaStream?: MediaStream,
) => {
	const prev: TrackType = mediaStore.get(userId) ?? {
		audioTrack: null,
		mediaStream: null,
		screenAudioTrack: null,
		screenVideoTrack: null,
		videoTrack: null,
	};
	const key = getKey(streamType, track.kind);
	mediaStore.set(userId, { ...prev, [key]: track, mediaStream: mediaStream ?? prev.mediaStream });
};

export const removeTrack = async (userId: string, streamType: StreamType, trackKind: string) => {
	const key = getKey(streamType, trackKind);
	const prev = mediaStore.get(userId);
	if (!prev) {
		return;
	}
	mediaStore.set(userId, { ...prev, [key]: null });
};

export const removeMedia = async (userId: string) => {
	mediaStore.delete(userId);
};

export const getPendingTrackStore = async (trackId: string) => pendingTracksStore.get(trackId);

export const setPendingTrackStore = async (trackId: string, entry: Partial<PendingTrackEntry>) => {
	const current = pendingTracksStore.get(trackId) ?? {};
	pendingTracksStore.set(trackId, { ...current, ...entry });
};

export const deletePendingTrackStore = async (trackId: string) => {
	pendingTracksStore.delete(trackId);
};
