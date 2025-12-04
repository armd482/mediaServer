import { createMutex } from '../lib/roomMutex.js';
import { TransceiverType } from '../type/media.js';

import { participantManager } from './participantManager.js';
import { trackManager } from './trackManager.js';

export const transceiverManager = (
	trackManagerInstance: ReturnType<typeof trackManager>,
	participantManagerInstance: ReturnType<typeof participantManager>,
) => {
	const userTransceiver = new Map<string, Map<string, TransceiverType>>();
	const { getMedia } = trackManagerInstance;
	const { getParticipant } = participantManagerInstance;
	const { runExclusive } = createMutex();

	const getTransceiver = (userId: string) => {
		const transceiver = userTransceiver.get(userId);
		if (!transceiver) {
			const t = new Map();
			userTransceiver.set(userId, t);
			return t as Map<string, TransceiverType>;
		}
		return transceiver;
	};

	const setRid = (transceiver: RTCRtpTransceiver, rid: string) => {
		try {
			const params = transceiver.sender.getParameters();
			if (!params.encodings || params.encodings.length === 0) {
				params.encodings = [{ rid }];
			} else {
				params.encodings[0].rid = rid;
			}
			transceiver.sender.setParameters(params);
		} catch (err) {
			console.warn('setRid failed or not supported:', err);
		}
	};

	const inactiveTransceiver = (t: RTCRtpTransceiver | null) => {
		if (!t) return;
		try {
			t.direction = 'inactive';
		} catch (e) {
			console.warn('failed to set direction inactive', e);
		}
	};

	const clearTransceiver = (transceiver: TransceiverType) => {
		inactiveTransceiver(transceiver.audio);
		inactiveTransceiver(transceiver.video);
		inactiveTransceiver(transceiver.screenAudio);
		inactiveTransceiver(transceiver.screenVideo);
	};

	const createPeerReciever = (pc: RTCPeerConnection, userId: string) => {
		const audio = pc.addTransceiver('audio', { direction: 'sendonly' });
		const video = pc.addTransceiver('video', { direction: 'sendonly' });

		const screenAudio = pc.addTransceiver('audio', { direction: 'sendonly' });
		setRid(screenAudio, 'screen-audio');

		const screenVideo = pc.addTransceiver('video', { direction: 'sendonly' });
		setRid(screenVideo, 'screen-video');

		const media = getMedia(userId);
		if (media) {
			if (media.audioTrack) {
				audio.sender.replaceTrack(media.audioTrack);
			}
			if (media.videoTrack) {
				video.sender.replaceTrack(media.videoTrack);
			}

			if (media.screenAudioTrack) {
				screenAudio.sender.replaceTrack(media.screenAudioTrack);
			}

			if (media.screenVideoTrack) {
				screenVideo.sender.replaceTrack(media.screenVideoTrack);
			}
		}

		return { audio, screenAudio, screenVideo, video } as TransceiverType;
	};

	const removeTransceiver = async (userId: string, roomId: string) => {
		await runExclusive(() => {
			userTransceiver.get(userId)?.forEach((transceiver) => clearTransceiver(transceiver));
			userTransceiver.delete(userId);

			getParticipant(roomId)?.forEach((user) => {
				const transceiver = userTransceiver.get(user)?.get(userId);
				if (!transceiver) {
					return;
				}
				clearTransceiver(transceiver);
				userTransceiver.get(user)?.delete(userId);
			});
		});
	};

	return { createPeerReciever, getTransceiver, removeTransceiver };
};
