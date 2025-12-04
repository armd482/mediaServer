import { Client } from '@stomp/stompjs';

import { createMutex } from '../lib/roomMutex.js';
import { signalSender } from '../signaling/signerSender.js';
import { TransceiverMidType, StreamType } from '../type/media.js';
import { MidPayloadType } from '../type/signal.js';

import { participantManager } from './participantManager.js';
import { trackManager } from './trackManager.js';
import { transceiverManager } from './transceiverManager.js';

interface MediaManagerProps {
	client: Client;
}
export const mediaManager = ({ client }: MediaManagerProps) => {
	const participants = participantManager();
	const { addParticipant, getParticipant, removeParticipant } = participants;
	const tracks = trackManager();
	const { removeMedia, updateMedia } = tracks;
	const { createPeerReciever, getTransceiver, removeTransceiver } = transceiverManager(tracks, participants);

	const { sendMid } = signalSender({ client });
	const { runExclusive } = createMutex();

	const addTransceiver = (id: string, pc: RTCPeerConnection) => {
		const transceiver = createPeerReciever(pc, id);
		return transceiver;
	};

	const finalizeMid = (id: string) => {
		const midMap = new Map<string, TransceiverMidType>();

		getTransceiver(id).forEach((t, otherUserId) => {
			if (t.audio?.mid) midMap.set(t.audio.mid, { id: otherUserId, type: 'USER' });
			if (t.video?.mid) midMap.set(t.video.mid, { id: otherUserId, type: 'USER' });
			if (t.screenAudio?.mid) midMap.set(t.screenAudio.mid, { id: otherUserId, type: 'SCREEN' });
			if (t.screenVideo?.mid) midMap.set(t.screenVideo.mid, { id: otherUserId, type: 'SCREEN' });
		});

		const payload: MidPayloadType = {
			id,
			mid: Object.fromEntries(midMap),
		};

		sendMid(payload);
	};

	const finalizeOtherMid = (id: string, roomId: string) => {
		const participant = getParticipant(roomId);
		participant?.forEach((userId) => {
			const midMap = new Map<string, TransceiverMidType>();
			const transceiver = getTransceiver(userId).get(id);
			if (transceiver?.audio?.mid) midMap.set(transceiver.audio.mid, { id, type: 'USER' });
			if (transceiver?.video?.mid) midMap.set(transceiver.video.mid, { id, type: 'USER' });
			if (transceiver?.screenAudio?.mid) midMap.set(transceiver.screenAudio.mid, { id, type: 'SCREEN' });
			if (transceiver?.screenVideo?.mid) midMap.set(transceiver.screenVideo.mid, { id, type: 'SCREEN' });

			const payload: MidPayloadType = {
				id: userId,
				mid: Object.fromEntries(midMap),
			};

			sendMid(payload);
		});
	};

	const prepareSenders = async (id: string, pc: RTCPeerConnection, roomId: string) => {
		const participant = getParticipant(roomId);

		if (!participant || participant.size === 0) {
			return;
		}

		await runExclusive(() => {
			participant.forEach((userId) => {
				const t = addTransceiver(userId, pc);
				getTransceiver(id).set(userId, t);
			});
			addParticipant(roomId, id);
		});
	};

	const prepareOtherSenders = async (id: string, pc: Map<string, RTCPeerConnection>, roomId: string) => {
		const participant = getParticipant(roomId);

		if (!participant || participant.size === 0) {
			return;
		}
		await runExclusive(() => {
			participant.forEach((userId) => {
				const peerConnection = pc.get(userId);
				if (!peerConnection) {
					return;
				}
				const transceiver = addTransceiver(id, peerConnection);
				getTransceiver(userId).set(id, transceiver);
			});
		});
	};

	const registerTrack = async (id: string, roomId: string, streamType: StreamType, track: MediaStreamTrack) => {
		updateMedia(id, streamType, track);

		const participant = getParticipant(roomId);
		if (!participant) {
			return;
		}
		participant.forEach((userId) => {
			if (id === userId) {
				return;
			}
			const t = getTransceiver(userId)?.get(id);
			if (!t) {
				return;
			}

			if (streamType === 'USER') {
				track.kind === 'audio' ? t.audio?.sender.replaceTrack(track) : t.video?.sender.replaceTrack(track);
			} else {
				track.kind === 'audio' ? t.screenAudio?.sender.replaceTrack(track) : t.screenVideo?.sender.replaceTrack(track);
			}
		});

		track.onended = () => {
			removeMedia(id);
			removeTransceiver(id, roomId);
		};
	};

	const closePeer = (userId: string, roomId: string) => {
		removeMedia(userId);
		removeParticipant(roomId, userId);
		removeTransceiver(userId, roomId);
	};

	return { closePeer, finalizeMid, finalizeOtherMid, prepareOtherSenders, prepareSenders, registerTrack };
};
