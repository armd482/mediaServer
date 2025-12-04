import { createMutex } from '../lib/roomMutex.js';
import { StreamType, TrackType } from '../type/media.js';

export const trackManager = () => {
	const userMedia = new Map<string, TrackType>();
	const { runExclusive } = createMutex();

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

	const getMedia = (userId: string) => {
		const media = userMedia.get(userId);
		if (media) {
			return media;
		}
		return {
			audioTrack: null,
			screenAudioTrack: null,
			screenVideoTrack: null,
			videoTrack: null,
		};
	};

	const updateMedia = async (userId: string, streamType: StreamType, track: MediaStreamTrack) => {
		await runExclusive(() => {
			const prev = getMedia(userId);
			const key = getKey(streamType, track.kind);
			userMedia.set(userId, { ...prev, [key]: track });
		});
	};

	const removeMedia = async (userId: string) => {
		await runExclusive(() => {
			userMedia.delete(userId);
		});
	};

	return {
		getMedia,
		removeMedia,
		updateMedia,
	};
};
