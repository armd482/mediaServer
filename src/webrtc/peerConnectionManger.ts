import { Client } from '@stomp/stompjs';
import wrtc from 'wrtc';

import { signalSender } from '../signaling/signerSender.js';
import {
	addPeerConnection,
	getPeerConnection,
	removeParticipant,
	removePeerConnection,
	removeUserMedia,
} from '../store/index.js';
import { updatePeer } from '../store/peerConnectionStore.js';
import {
	AddTrackProps,
	ClosePeerConnectionProps,
	ConnectPeerConnectionProps,
	createSdpProps,
	RegisterIceProps,
	RegisterSdpProps,
} from '../type/peerConnection.js';

import { mediaManager } from './mediaManager.js';

interface PeerConnectionManagerProps {
	client: Client;
}

export const peerConnectionManager = ({ client }: PeerConnectionManagerProps) => {
	const { finalizeMid, finalizeOtherMid, prepareOtherSenders, prepareSenders, registerTrack, removeTransceiver } =
		mediaManager({
			client,
		});

	const connectPeerConnection = async ({ roomId, userId }: ConnectPeerConnectionProps) => {
		const { sendIce } = signalSender({ client });
		const connection = await getPeerConnection(userId);

		if (connection) {
			return;
		}

		const pc = new wrtc.RTCPeerConnection({
			iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
		});

		await prepareSenders(userId, pc, roomId);
		await prepareOtherSenders(userId, roomId);

		pc.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
			if (!e.candidate) {
				return;
			}
			const payload = {
				ice: JSON.stringify(e.candidate),
				userId,
			};
			sendIce(payload);
		};

		pc.ontrack = async (e: RTCTrackEvent) => {
			registerTrack(userId, roomId, e.track);
			console.log(e);
		};

		await addPeerConnection(userId, pc);
		return;
	};

	const registerSdp = async ({ sdp, userId }: RegisterSdpProps) => {
		const data = await getPeerConnection(userId);
		if (!data) {
			return;
		}
		await data.pc.setRemoteDescription(sdp);
	};

	const createSdp = async ({ userId }: createSdpProps) => {
		const data = await getPeerConnection(userId);
		if (!data) {
			return;
		}
		const sdp = await data.pc.createAnswer();
		await data.pc.setLocalDescription(sdp);
		return sdp;
	};

	const addTrack = async ({ stream, track, userId }: AddTrackProps) => {
		const data = await getPeerConnection(userId);
		if (!data) {
			return;
		}
		if (stream) {
			data.pc.addTrack(track, stream);
			return;
		}
		data.pc.addTrack(track);
	};

	const registerIce = async ({ ice, userId }: RegisterIceProps) => {
		const data = await getPeerConnection(userId);
		if (!data) return;

		const { iceQueue, pc, remoteSet } = data;

		if (!remoteSet) {
			iceQueue.push(ice);
			return updatePeer(userId, { iceQueue });
		}

		pc.addIceCandidate(ice);
	};

	const closePeerConnection = async ({ id, roomId }: ClosePeerConnectionProps) => {
		const data = await getPeerConnection(id);
		data?.pc?.close();
		await removePeerConnection(id);
		await removeTransceiver(id, roomId);
		await removeParticipant(roomId, id);
		await removeUserMedia(id);
	};
	return {
		addTrack,
		closePeerConnection,
		connectPeerConnection,
		createSdp,
		finalizeMid,
		finalizeOtherMid,
		registerIce,
		registerSdp,
	};
};
