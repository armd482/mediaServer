import wrtc from 'wrtc';
import WebSocket from 'ws';

import { signalSender } from '../signaling/signerSender.js';
import {
	addPeerConnection,
	getPeerConnection,
	getUserTrackInfo,
	removeParticipant,
	removePeerConnection,
	removeUserTrackInfo,
	updatePeerConnection,
} from '../store/index.js';
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
	const { handleNegotiation, handleTrack, registerOtherTracks } = mediaManager({
		client,
	});

	const createPeerConnection = async ({ roomId, userId }: CreatePeerConnectionProps) => {
		let negotiationTimer: NodeJS.Timeout | null = null;

		const { sendIce } = signalSender({ client });

		const pc: RTCPeerConnection = new wrtc.RTCPeerConnection({
			iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
		});

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

				await handleNegotiation(userId);
			}, 100);
		};

		pc.ontrack = async (e) => {
			const mid = e.transceiver.mid;
			if (!mid) {
				return;
			}
			const trackInfo = await getUserTrackInfo(userId, mid);
			console.log(trackInfo, e.track.readyState, e.track.enabled, e.track.muted);
			handleTrack(userId, roomId, e);
		};

		pc.addTransceiver('audio', { direction: 'recvonly' });
		pc.addTransceiver('video', { direction: 'recvonly' });
		pc.addTransceiver('audio', { direction: 'recvonly' });
		pc.addTransceiver('video', { direction: 'recvonly' });

		await registerOtherTracks(userId, roomId, pc);
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
		await removeUserTrackInfo(id);
	};
	return {
		closePeerConnection,
		createAnswerSdp,
		createOfferSdp,
		createPeerConnection,
		handleNegotiation,
		registerIce,
		registerLocalSdp,
		registerRemoteSdp,
	};
};
