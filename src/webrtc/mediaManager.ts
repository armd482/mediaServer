import { Mutex } from 'async-mutex';

import { TrackType, ParticipantType, TransceiverMidType } from '../type/media.js';
import { StreamType } from '../type/signal.js';
export const mediaManager = () => {
	const participants = new Map<string, ParticipantType>();
	const userMedia = new Map<string, TrackType>();
	const screenMedia = new Map<string, TrackType>();
	const roomMutex = new Map<string, Mutex>();
	const getRoomMutex = (roomId: string) => {
		if (!roomMutex.has(roomId)) {
			roomMutex.set(roomId, new Mutex());
		}
		return roomMutex.get(roomId)!;
	};
	const addParticipantsTracks = async (pc: RTCPeerConnection, roomId: string) => {
		const mutex = getRoomMutex(roomId);
		return mutex.runExclusive(() => {
			const midMap = new Map<string, TransceiverMidType>();
			const participant = participants.get(roomId);
			if (!participant) return {};
			participant.USER.forEach((id) => {
				const media = userMedia.get(id);
				if (!media) return;
				const { audioTrack, videoTrack } = media;
				const { audioMid, videoMid } = addTransceiver(pc, audioTrack, videoTrack);
				midMap.set(audioMid ?? id + 'audio', { id, type: 'USER' });
				midMap.set(videoMid ?? id + 'video', { id, type: 'USER' });
			});
			participant.SCREEN.forEach((id) => {
				const media = screenMedia.get(id);
				if (!media) return;
				const { audioTrack, videoTrack } = media;
				const { audioMid, videoMid } = addTransceiver(pc, audioTrack, videoTrack);
				midMap.set(audioMid ?? id + 'audio', { id, type: 'SCREEN' });
				midMap.set(videoMid ?? id + 'video', { id, type: 'SCREEN' });
			});
			return Object.fromEntries(midMap) as Record<string, TransceiverMidType>;
		});
	};
	const registerTrack = async (
		streamType: StreamType,
		id: string,
		roomId: string,
		track: MediaStreamTrack,
		pc: Map<string, RTCPeerConnection>,
		ownerId?: string,
	) => {
		const mutex = getRoomMutex(roomId);
		return mutex.runExclusive(() => {
			const midUserMap = new Map<string, TransceiverMidType>();
			const { audioTrack, videoTrack } = (streamType === 'USER' ? userMedia.get(id) : screenMedia.get(id)) ?? {
				audioTrack: null,
				videoTrack: null,
			};
			if (streamType === 'USER') {
				userMedia.set(id, {
					audioTrack: track.kind === 'audio' ? track : audioTrack,
					videoTrack: track.kind === 'video' ? track : videoTrack,
				});
			} else {
				screenMedia.set(id, {
					audioTrack: track.kind === 'audio' ? track : audioTrack,
					videoTrack: track.kind === 'video' ? track : videoTrack,
				});
			}
			participants.get(roomId)?.USER.forEach((user) => {
				if (user === ownerId) return;
				const transceiver = pc.get(user)?.addTransceiver(track, { direction: 'recvonly' });
				if (transceiver?.mid) {
					midUserMap.set(transceiver.mid, { id, type: 'USER' });
				}
			});
			const participant = participants.get(roomId);
			if (participant) {
				participant[streamType].add(id);
			} else {
				participants.set(roomId, {
					SCREEN: streamType === 'SCREEN' ? new Set([id]) : new Set(),
					USER: streamType === 'USER' ? new Set([id]) : new Set(),
				});
			}
			return Object.fromEntries(midUserMap) as Record<string, TransceiverMidType>;
		});
	};
	const addTransceiver = (
		pc: RTCPeerConnection,
		audioTrack: MediaStreamTrack | null,
		videoTrack: MediaStreamTrack | null,
	) => {
		const audioTransceiver = pc.addTransceiver('audio', { direction: 'recvonly' });
		const videoTransceiver = pc.addTransceiver('video', { direction: 'recvonly' });
		if (audioTrack) audioTransceiver.sender.replaceTrack(audioTrack);
		if (videoTrack) videoTransceiver.sender.replaceTrack(videoTrack);
		return { audioMid: audioTransceiver.mid, videoMid: videoTransceiver.mid };
	};
	return { addParticipantsTracks, registerTrack };
};
