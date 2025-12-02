import wrtc from 'wrtc';

import {
	AddTrackProps,
	ConnectPeerConnectionProps,
	createSdpProps,
	RegisterIceProps,
	RegisterSdpProps,
} from '../type/peerConnection.js';
import { StreamType } from '../type/signal.js';

export const peerConnectionManager = () => {
	const peerConnection = new Map<string, RTCPeerConnection>();
	const screenPeerConnection = new Map<string, RTCPeerConnection>();

	const connectPeerConnection = async ({ onIcecandidate, onTrack, streamType, userId }: ConnectPeerConnectionProps) => {
		const connection = streamType === 'SCREEN' ? screenPeerConnection.get(userId) : peerConnection.get(userId);

		if (connection) {
			return;
		}

		const pc = new wrtc.RTCPeerConnection({
			iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
		});

		pc.onicecandidate = onIcecandidate?.();
		pc.ontrack = onTrack?.();

		if (streamType === 'USER') {
			peerConnection.set(userId, pc);
			return;
		}

		peerConnection.set(userId, pc);
	};

	const registerSdp = async ({ sdp, streamType, userId }: RegisterSdpProps) => {
		const pc = getPeerConnection(userId, streamType);
		await pc.setLocalDescription(sdp);
	};

	const createSdp = async ({ streamType, userId }: createSdpProps) => {
		const pc = getPeerConnection(userId, streamType);
		const sdp = await pc.createAnswer();
		return sdp;
	};

	const addTrack = ({ stream, streamType, track, userId }: AddTrackProps) => {
		const pc = getPeerConnection(userId, streamType);
		if (stream) {
			pc.addTrack(track, stream);
			return;
		}
		pc.addTrack(track);
	};

	const registerIce = async ({ ice, streamType, userId }: RegisterIceProps) => {
		const pc = getPeerConnection(userId, streamType);
		pc.addIceCandidate(ice);
	};

	const getPeerConnection = (userId: string, streamType: StreamType) => {
		const pc = streamType === 'SCREEN' ? screenPeerConnection.get(userId) : peerConnection.get(userId);

		if (!pc) {
			throw new Error('존재하지 않는 peerConnection입니다.');
		}
		return pc;
	};

	return { addTrack, connectPeerConnection, createSdp, registerIce, registerSdp };
};
