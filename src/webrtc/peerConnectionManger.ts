import { Client } from '@stomp/stompjs';
import wrtc from 'wrtc';

import { signalSender } from '../signaling/signerSender.js';
import { addPeerConnection, getPeerConnection } from '../store/index.js';
import {
	AddTrackProps,
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
	const { finalizeMid, finalizeOtherMid, prepareOtherSenders, prepareSenders, registerTrack } = mediaManager({
		client,
	});

	const connectPeerConnection = async ({ id, roomId }: ConnectPeerConnectionProps) => {
		const { sendIce } = signalSender({ client });
		const connection = await getPeerConnection(id);

		if (connection) {
			return;
		}

		const pc = new wrtc.RTCPeerConnection({
			iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
		});

		await prepareSenders(id, pc, roomId);
		await prepareOtherSenders(id, roomId);

		pc.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
			if (!e.candidate) {
				return;
			}
			const payload = {
				ice: JSON.stringify(e.candidate),
				id,
			};
			sendIce(payload);
		};

		pc.ontrack = async (e: RTCTrackEvent) => {
			registerTrack(id, roomId, e.track);
		};

		await addPeerConnection(id, pc);
		return;
	};

	const registerSdp = async ({ id, sdp }: RegisterSdpProps) => {
		const pc = await getPeerConnection(id);
		if (!pc) {
			return;
		}
		await pc.setLocalDescription(sdp);
	};

	const createSdp = async ({ id }: createSdpProps) => {
		const pc = await getPeerConnection(id);
		if (!pc) {
			return;
		}
		const sdp = await pc.createAnswer();
		return sdp;
	};

	const addTrack = async ({ id, stream, track }: AddTrackProps) => {
		const pc = await getPeerConnection(id);
		if (!pc) {
			return;
		}
		if (stream) {
			pc.addTrack(track, stream);
			return;
		}
		pc.addTrack(track);
	};

	const registerIce = async ({ ice, id }: RegisterIceProps) => {
		const pc = await getPeerConnection(id);
		if (!pc) {
			return;
		}
		pc.addIceCandidate(ice);
	};

	return { addTrack, connectPeerConnection, createSdp, finalizeMid, finalizeOtherMid, registerIce, registerSdp };
};
