import wrtc from 'wrtc';
import WebSocket from 'ws';

import { signalSender } from '../signaling/signerSender.js';
import {
	addParticipant,
	addPeerConnection,
	deletePendingTrack,
	getPeerConnection,
	getPendingTrack,
	removeParticipant,
	removePeerConnection,
	removeUserMedia,
	setPendingTrack,
	updatePeerConnection,
} from '../store/index.js';
import { PendingTrackEntry } from '../type/media.js';
import {
	ClosePeerConnectionProps,
	CreatePeerConnectionProps,
	CreateSdpProps,
	RegisterIceProps,
	RegisterLocalSdpProps,
	RegisterRemoteSdpProps,
} from '../type/peerConnection.js';

import { mediaManager } from './mediaManager.js';

interface PeerConnectionManagerProps {
	client: WebSocket;
}

export const peerConnectionManager = ({ client }: PeerConnectionManagerProps) => {
	const { negotiation, registerOtherTracks, registerOwnerTrack } = mediaManager({
		client,
	});

	const createPeerConnection = async ({ roomId, userId }: CreatePeerConnectionProps) => {
		let negotiationTimer: NodeJS.Timeout | null = null;

		const { sendIce } = signalSender({ client });
		const connection = await getPeerConnection(userId);

		if (connection) {
			return connection.pc;
		}

		const pc: RTCPeerConnection = new wrtc.RTCPeerConnection({
			iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
		});

		await registerOtherTracks(userId, roomId, pc);

		await addParticipant(roomId, userId);

		pc.onicecandidate = async (e: RTCPeerConnectionIceEvent) => {
			const data = await getPeerConnection(userId);
			if (!data || !e.candidate) {
				return;
			}
			if (!data.remoteSet) {
				await updatePeerConnection(userId, { iceQueue: [...(data.iceQueue ?? []), e.candidate] });
				return;
			}
			const payload = {
				ice: JSON.stringify(e.candidate),
				userId,
			};
			sendIce(payload);
		};

		pc.ontrack = async (e: RTCTrackEvent) => {
			console.log('onTrack');
			const mid = e.transceiver.mid as string;
			const entry = (await getPendingTrack(userId, e.track.id)) as PendingTrackEntry | undefined;

			if (!entry || !entry.streamType || !entry.userId) {
				await setPendingTrack(userId, mid, {
					track: e.track,
				});
				return;
			}
			await deletePendingTrack(userId, mid);
			await registerOwnerTrack(userId, roomId, e.track, entry.streamType);
		};

		pc.onnegotiationneeded = async () => {
			if (pc.signalingState !== 'stable') {
				return;
			}

			if (negotiationTimer) {
				clearTimeout(negotiationTimer);
			}

			negotiationTimer = setTimeout(async () => {
				negotiationTimer = null;
				console.log('negotiation ', userId);

				await negotiation(userId);
			}, 100);
		};

		await addPeerConnection(userId, pc);
		return pc;
	};

	const registerRemoteSdp = async ({ sdp, userId }: RegisterRemoteSdpProps) => {
		const data = await getPeerConnection(userId);
		if (!data) {
			return;
		}

		const type = sdp.type;

		if (type === 'offer') {
			await data.pc.setRemoteDescription(sdp);
			return;
		}

		if (type === 'answer') {
			if (data.pc.signalingState !== 'have-local-offer') {
				return;
			}
			await data.pc.setRemoteDescription(sdp);
			return;
		}
	};

	const createOfferSdp = async ({ userId }: CreateSdpProps) => {
		const data = await getPeerConnection(userId);
		if (!data) {
			return;
		}
		const sdp = await data.pc.createOffer();
		return sdp;
	};

	const createAnswerSdp = async ({ userId }: CreateSdpProps) => {
		const data = await getPeerConnection(userId);
		if (!data) {
			return;
		}
		const sdp = await data.pc.createAnswer();
		return sdp;
	};

	const registerLocalSdp = async ({ sdp, userId }: RegisterLocalSdpProps) => {
		const data = await getPeerConnection(userId);
		if (!data) {
			return;
		}
		await data.pc.setLocalDescription(sdp);
	};

	const registerIce = async ({ ice, userId }: RegisterIceProps) => {
		const data = await getPeerConnection(userId);
		if (!data) return;

		const { iceQueue, pc, remoteSet } = data;

		if (!remoteSet) {
			iceQueue.push(ice);
			await updatePeerConnection(userId, { iceQueue });
			return;
		}

		pc.addIceCandidate(ice);
	};

	const closePeerConnection = async ({ id, roomId }: ClosePeerConnectionProps) => {
		const data = await getPeerConnection(id);
		data?.pc?.close();
		await removePeerConnection(id);
		await removeParticipant(roomId, id);
		await removeUserMedia(id);
	};
	return {
		closePeerConnection,
		createAnswerSdp,
		createOfferSdp,
		createPeerConnection,
		registerIce,
		registerLocalSdp,
		registerOwnerTrack,
		registerRemoteSdp,
	};
};
