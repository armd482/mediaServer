import { StreamType, TrackType } from '../type/media.js';

export const trackManager = () => {
	const userMedia = new Map<string, TrackType>();

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

	const updateMedia = (userId: string, streamType: StreamType, track: MediaStreamTrack) => {
		const prev = getMedia(userId);
		const key = getKey(streamType, track.kind);
		userMedia.set(userId, { ...prev, [key]: track });
	};

	const removeMedia = (userId: string) => {
		userMedia.delete(userId);
	};

	return {
		getMedia,
		removeMedia,
		updateMedia,
	};
};
