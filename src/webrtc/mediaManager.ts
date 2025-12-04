import { Client } from '@stomp/stompjs';

import { signalSender } from '../signaling/signerSender.js';
import { TrackType, ParticipantType, TransceiverMidType, TransceiverType, StreamType } from '../type/media.js';
import { MidPayloadType } from '../type/signal.js';

interface MediaManagerProps {
	client: Client;
}
export const mediaManager = ({ client }: MediaManagerProps) => {
	const participants = new Map<string, ParticipantType>();
	const userMedia = new Map<string, TrackType>();
	const userTransceiver = new Map<string, Map<string, TransceiverType>>();

	const { sendMid } = signalSender({ client });

	const getParticipant = (roomId: string) => {
		if (!participants.has(roomId)) {
			participants.set(roomId, new Set());
		}
		return participants.get(roomId);
	};

	const setRid = (t: RTCRtpTransceiver, value: string) => {
		const parameters = t.sender.getParameters();
		parameters.encodings[0].rid = value;
		t.sender.setParameters(parameters);
	};

	const addTransceiver = (id: string, pc: RTCPeerConnection, midMap: Map<string, TransceiverMidType>) => {
		const t: TransceiverType = { audio: null, screenAudio: null, screenVideo: null, video: null };

		const audioTransceiver = pc.addTransceiver('audio', { direction: 'sendonly' });
		const videoTransceiver = pc.addTransceiver('video', { direction: 'sendonly' });
		const screenAudioTransceiver = pc.addTransceiver('audio', { direction: 'sendonly' });
		setRid(screenAudioTransceiver, 'screen-audio');
		const screenVideoTransceiver = pc.addTransceiver('video', { direction: 'sendonly' });
		setRid(screenVideoTransceiver, 'screen-video');

		Object.assign(t, { audio: audioTransceiver });
		Object.assign(t, { video: videoTransceiver });
		Object.assign(t, { screenAudio: screenAudioTransceiver });
		Object.assign(t, { screenVideo: screenVideoTransceiver });

		if (audioTransceiver.mid) {
			midMap.set(audioTransceiver.mid, { id, type: 'USER' });
		}

		if (videoTransceiver.mid) {
			midMap.set(videoTransceiver.mid, { id, type: 'USER' });
		}

		if (screenAudioTransceiver.mid) {
			midMap.set(screenAudioTransceiver.mid, { id, type: 'SCREEN' });
		}

		if (screenVideoTransceiver.mid) {
			midMap.set(screenVideoTransceiver.mid, { id, type: 'SCREEN' });
		}

		const media = userMedia.get(id);
		if (!media) {
			return t;
		}

		if (media.audioTrack) {
			audioTransceiver.sender.replaceTrack(media.audioTrack);
		}

		if (media.videoTrack) {
			videoTransceiver.sender.replaceTrack(media.videoTrack);
		}

		if (media.screenAudioTrack) {
			screenAudioTransceiver.sender.replaceTrack(media.screenAudioTrack);
		}

		if (media.screenVideoTrack) {
			screenVideoTransceiver.sender.replaceTrack(media.screenVideoTrack);
		}

		return t;
	};

	const prepareSenders = (id: string, pc: RTCPeerConnection, roomId: string) => {
		const midMap = new Map<string, TransceiverMidType>();
		const participant = getParticipant(roomId);
		userTransceiver.set(id, new Map<string, TransceiverType>());

		if (!participant || participant.size === 0) {
			return;
		}

		participant.forEach((userId) => {
			const t = addTransceiver(userId, pc, midMap);
			userTransceiver.get(id)?.set(userId, t);
		});

		const payload: MidPayloadType = {
			id,
			mid: Object.fromEntries(midMap),
		};

		sendMid(payload);
	};

	const prepareOtherSenders = (id: string, pc: Map<string, RTCPeerConnection>, roomId: string) => {
		const participant = getParticipant(roomId);

		if (!participant || participant.size === 0) {
			return;
		}

		participant.forEach((userId) => {
			const midMap = new Map<string, TransceiverMidType>();
			const peerConnection = pc.get(userId);
			if (!peerConnection) {
				return;
			}
			const transceiver = addTransceiver(id, peerConnection, midMap);
			userTransceiver.get(userId)?.set(id, transceiver);
			const payload: MidPayloadType = {
				id: userId,
				mid: Object.fromEntries(midMap),
			};
			sendMid(payload);
		});
	};

	const registerTrack = (id: string, roomId: string, streamType: StreamType, track: MediaStreamTrack) => {
		const prev = userMedia.get(id) ?? {
			audioTrack: null,
			screenAudioTrack: null,
			screenVideoTrack: null,
			videoTrack: null,
		};

		userMedia.set(id, {
			...prev,
			[streamType === 'USER'
				? track.kind === 'audio'
					? 'audioTrack'
					: 'videoTrack'
				: track.kind === 'audio'
					? 'screenAudioTrack'
					: 'screenVideoTrack']: track,
		});

		const participant = getParticipant(roomId);
		if (!participant) {
			return;
		}
		participant.forEach((userId) => {
			if (id === userId) {
				return;
			}
			const t = userTransceiver.get(userId)?.get(id);
			if (!t) {
				return;
			}

			if (streamType === 'USER') {
				track.kind === 'audio' ? t.audio?.sender.replaceTrack(track) : t.video?.sender.replaceTrack(track);
			} else {
				track.kind === 'audio' ? t.screenAudio?.sender.replaceTrack(track) : t.screenVideo?.sender.replaceTrack(track);
			}
		});
	};

	return { prepareOtherSenders, prepareSenders, registerTrack };
};
