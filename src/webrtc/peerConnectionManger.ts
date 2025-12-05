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
		};

		await addPeerConnection(userId, pc);
		return;
	};

	const registerSdp = async ({ sdp, userId }: RegisterSdpProps) => {
		const pc = await getPeerConnection(userId);
		if (!pc) {
			return;
		}
		await pc.setLocalDescription(sdp);
	};

	const createSdp = async ({ userId }: createSdpProps) => {
		const pc = await getPeerConnection(userId);
		if (!pc) {
			return;
		}
		const sdp = await pc.createAnswer();
		return sdp;
	};

	const addTrack = async ({ stream, track, userId }: AddTrackProps) => {
		const pc = await getPeerConnection(userId);
		if (!pc) {
			return;
		}
		if (stream) {
			pc.addTrack(track, stream);
			return;
		}
		pc.addTrack(track);
	};

	const registerIce = async ({ ice, userId }: RegisterIceProps) => {
		const pc = await getPeerConnection(userId);
		if (!pc) {
			return;
		}
		pc.addIceCandidate(ice);
	};

	const closePeerConnection = async ({ id, roomId }: ClosePeerConnectionProps) => {
		const pc = await getPeerConnection(id);
		pc?.close();
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
