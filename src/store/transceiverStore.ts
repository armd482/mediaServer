import { DeviceTransceiverType } from '../type/peerConnection.js';

const trasnceiversStore = new Map<string, Map<string, DeviceTransceiverType>>(); //to -> from

export const getTransceiverStore = async (toUserId: string, fromUserId?: string) => {
	if (fromUserId) {
		return trasnceiversStore.get(toUserId)?.get(fromUserId);
	}
	return trasnceiversStore.get(toUserId);
};

export const setTransceiverStore = async (
	toUserId: string,
	fromUserId: string,
	value: Partial<DeviceTransceiverType>,
) => {
	if (!trasnceiversStore.get(toUserId)) {
		trasnceiversStore.set(toUserId, new Map<string, DeviceTransceiverType>());
	}
	const prev =
		trasnceiversStore.get(toUserId)?.get(fromUserId) ??
		({
			audio: null,
			screenAudio: null,
			screenVideo: null,
			video: null,
		} as DeviceTransceiverType);
	trasnceiversStore.get(toUserId)?.set(fromUserId, { ...prev, ...value });
};

export const deleteTransceiverStore = async (toUserId: string, fromUserId?: string) => {
	if (fromUserId) {
		trasnceiversStore.get(toUserId)?.delete(fromUserId);
		if (trasnceiversStore.get(toUserId)?.size === 0) {
			trasnceiversStore.delete(toUserId);
		}
		return;
	}
	trasnceiversStore.delete(toUserId);
};
