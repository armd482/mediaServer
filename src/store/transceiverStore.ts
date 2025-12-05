import { TransceiverType } from '../type/media.js';

const userTransceiverStore = new Map<string, Map<string, TransceiverType>>();

export const getTransceiver = async (userId: string) => {
	if (!userTransceiverStore.has(userId)) {
		userTransceiverStore.set(userId, new Map());
	}
	return userTransceiverStore.get(userId)!;
};

export const removeTransceiver = async (userId: string) => {
	userTransceiverStore.delete(userId);
};

export const removePeerTransceiver = async (id: string, userId: string) => {
	try {
		const transceiver = userTransceiverStore.get(id);
		transceiver?.delete(userId);
	} catch {}
};
