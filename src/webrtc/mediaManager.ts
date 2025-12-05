import { Client } from '@stomp/stompjs';

import { signalSender } from '../signaling/signerSender.js';
import {
	addParticipant,
	getParticipant,
	getPeerConnection,
	getUserPeerTransceiver,
	isScreenTrackId,
	removeParticipant,
	removeScreenTrackId,
	removeUserMedia,
	removeUserTrack,
	updateUserMedia,
} from '../store/index.js';
import { TransceiverMidType } from '../type/media.js';
import { MidPayloadType } from '../type/signal.js';

import { transceiverManager } from './transceiverManager.js';

interface MediaManagerProps {
	client: Client;
}
export const mediaManager = ({ client }: MediaManagerProps) => {
	const { createPeerReciever, removeTransceiver } = transceiverManager();

	const { sendMid } = signalSender({ client });

	const addTransceiver = (id: string, pc: RTCPeerConnection) => {
		const transceiver = createPeerReciever(pc, id);
		return transceiver;
	};

	const finalizeMid = async (id: string) => {
		const midMap = new Map<string, TransceiverMidType>();
		const transceiver = await getUserPeerTransceiver(id);

		transceiver.forEach((t, otherUserId) => {
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

	const finalizeOtherMid = async (id: string, roomId: string) => {
		const participant = await getParticipant(roomId);
		await Promise.all(
			Array.from(participant).map(async (userId) => {
				const midMap = new Map<string, TransceiverMidType>();
				const transceiver = (await getUserPeerTransceiver(userId)).get(id);
				if (transceiver?.audio?.mid) midMap.set(transceiver.audio.mid, { id, type: 'USER' });
				if (transceiver?.video?.mid) midMap.set(transceiver.video.mid, { id, type: 'USER' });
				if (transceiver?.screenAudio?.mid) midMap.set(transceiver.screenAudio.mid, { id, type: 'SCREEN' });
				if (transceiver?.screenVideo?.mid) midMap.set(transceiver.screenVideo.mid, { id, type: 'SCREEN' });

				const payload: MidPayloadType = {
					id: userId,
					mid: Object.fromEntries(midMap),
				};

				sendMid(payload);
			}),
		);
	};

	const prepareSenders = async (id: string, pc: RTCPeerConnection, roomId: string) => {
		const participant = await getParticipant(roomId);

		if (!participant || participant.size === 0) {
			return;
		}

		await Promise.all(
			Array.from(participant).map(async (userId) => {
				const t = await addTransceiver(userId, pc);
				if (!t) {
					return;
				}
				(await getUserPeerTransceiver(id)).set(userId, t);
			}),
		);
		addParticipant(roomId, id);
	};

	const prepareOtherSenders = async (id: string, roomId: string) => {
		const participant = await getParticipant(roomId);

		if (!participant || participant.size === 0) {
			return;
		}

		await Promise.all(
			Array.from(participant).map(async (userId) => {
				const peerConnection = await getPeerConnection(userId);
				if (!peerConnection) {
					return;
				}
				const transceiver = await addTransceiver(id, peerConnection);
				if (!transceiver) {
					return;
				}
				(await getUserPeerTransceiver(userId)).set(id, transceiver);
			}),
		);
	};

	const registerTrack = async (id: string, roomId: string, track: MediaStreamTrack) => {
		const streamType = (await isScreenTrackId(track.id)) ? 'SCREEN' : 'USER';
		await updateUserMedia(id, streamType, track);

		const participant = await getParticipant(roomId);
		if (!participant) {
			return;
		}

		await Promise.all(
			Array.from(participant).map(async (userId) => {
				if (id === userId) {
					return;
				}
				const t = (await getUserPeerTransceiver(userId))?.get(id);
				if (!t) {
					return;
				}

				if (streamType === 'USER') {
					track.kind === 'audio' ? t.audio?.sender.replaceTrack(track) : t.video?.sender.replaceTrack(track);
				} else {
					track.kind === 'audio'
						? t.screenAudio?.sender.replaceTrack(track)
						: t.screenVideo?.sender.replaceTrack(track);
				}
			}),
		);

		track.onended = async () => {
			removeUserTrack(id, streamType, track.kind);
			if (streamType === 'SCREEN') {
				await removeScreenTrackId(track.id);
			}
		};
	};

	const closePeer = async (userId: string, roomId: string) => {
		await removeUserMedia(userId);
		await removeParticipant(roomId, userId);
		await removeTransceiver(userId, roomId);
	};

	return { closePeer, finalizeMid, finalizeOtherMid, prepareOtherSenders, prepareSenders, registerTrack };
};
