import { TrackInfoType } from '../type/media.js';

const userTrackInfoStore = new Map<string, Map<string, TrackInfoType>>(); //key: userId, innerKey: mid

export const getUserTrackInfoStore = async (userId: string, mid?: string) => {
	if (mid) {
		return userTrackInfoStore.get(userId)?.get(mid) as TrackInfoType | undefined;
	}
	return (userTrackInfoStore.get(userId) ?? new Map<string, TrackInfoType>()) as Map<string, TrackInfoType>;
};

export const updateUserTrackInfoStore = async (userId: string, mid: string, value: TrackInfoType) => {
	if (!userTrackInfoStore.has(userId)) {
		userTrackInfoStore.set(userId, new Map());
	}

	userTrackInfoStore.get(userId)?.set(mid, value);
};

export const removeTrackInfoStore = async (userId: string, mid?: string) => {
	if (mid) {
		userTrackInfoStore.get(userId)?.delete(mid);
		return;
	}
	userTrackInfoStore.delete(userId);
};
