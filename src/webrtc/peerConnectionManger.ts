import { Client } from '@stomp/stompjs';
import wrtc from 'wrtc';

import { signalSender } from '../signaling/signerSender.js';
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
	const peerConnection = new Map<string, RTCPeerConnection>();
	const { finalizeMid, finalizeOtherMid, prepareOtherSenders, prepareSenders, registerTrack } = mediaManager({
		client,
	});

	const connectPeerConnection = async ({ id, roomId }: ConnectPeerConnectionProps) => {
		const { sendIce } = signalSender({ client });
		const connection = peerConnection.get(id);

		if (connection) {
			return;
		}

		const pc = new wrtc.RTCPeerConnection({
			iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
		});

		prepareSenders(id, pc, roomId);
		prepareOtherSenders(id, peerConnection, roomId);

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
			const parameters = e.transceiver.sender.getParameters();
			const rid = parameters.encodings[0].rid;
			const streamType = rid?.includes('screen') ? 'SCREEN' : 'USER';
			registerTrack(id, roomId, streamType, e.track);
		};

		peerConnection.set(id, pc);
		return;
	};

	const registerSdp = async ({ id, sdp }: RegisterSdpProps) => {
		const pc = getPeerConnection(id);
		await pc.setLocalDescription(sdp);
	};

	const createSdp = async ({ id }: createSdpProps) => {
		const pc = getPeerConnection(id);
		const sdp = await pc.createAnswer();
		return sdp;
	};

	const addTrack = ({ id, stream, track }: AddTrackProps) => {
		const pc = getPeerConnection(id);
		if (stream) {
			pc.addTrack(track, stream);
			return;
		}
		pc.addTrack(track);
	};

	const registerIce = async ({ ice, id }: RegisterIceProps) => {
		const pc = getPeerConnection(id);
		pc.addIceCandidate(ice);
	};

	const getPeerConnection = (id: string) => {
		const pc = peerConnection.get(id);

		if (!pc) {
			throw new Error('존재하지 않는 peerConnection입니다.');
		}
		return pc;
	};

	return { addTrack, connectPeerConnection, createSdp, finalizeMid, finalizeOtherMid, registerIce, registerSdp };
};
