import {
	getParticipant,
	getUserMedia,
	getUserPeerTransceiver,
	removeUserPeerTransceiver,
	removeUserTransceiver,
} from '../store/index.js';
import { TransceiverType } from '../type/media.js';

export const transceiverManager = () => {
	const createPeerReciever = async (pc: RTCPeerConnection, userId: string) => {
		const audio = pc.addTransceiver('audio', { direction: 'sendonly' });
		const video = pc.addTransceiver('video', { direction: 'sendonly' });

		const screenAudio = pc.addTransceiver('audio', { direction: 'sendonly' });

		const screenVideo = pc.addTransceiver('video', { direction: 'sendonly' });

		const media = await getUserMedia(userId);

		if (!media) {
			return;
		}

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

		return { audio, screenAudio, screenVideo, video } as TransceiverType;
	};

	const inactiveTransceiver = (t: RTCRtpTransceiver | null) => {
		if (!t) return;
		try {
			t.direction = 'inactive';
		} catch (e) {
			console.warn('failed to set direction inactive', e);
		}
	};
	const clearTransceiver = (transceiver: TransceiverType | undefined) => {
		if (!transceiver) {
			return;
		}
		inactiveTransceiver(transceiver.audio);
		inactiveTransceiver(transceiver.video);
		inactiveTransceiver(transceiver.screenAudio);
		inactiveTransceiver(transceiver.screenVideo);
	};

	const removeTransceiver = async (userId: string, roomId: string) => {
		const userTransceiver = await getUserPeerTransceiver(userId);
		userTransceiver.forEach((transceiver) => clearTransceiver(transceiver));
		await removeUserTransceiver(userId);

		const participant = await getParticipant(roomId);

		await Promise.all(
			Array.from(participant).map(async (user) => {
				const transceiver = await getUserPeerTransceiver(user);
				if (!transceiver) {
					return;
				}

				const t = transceiver.has(userId);
				if (!t) {
					return;
				}
				clearTransceiver(transceiver.get(userId));
				await removeUserPeerTransceiver(user, userId);
			}),
		);
	};

	return { createPeerReciever, removeTransceiver };
};
