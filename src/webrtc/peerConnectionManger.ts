import wrtc from 'wrtc';

import { signalSender } from '../signaling/signerSender.js';
import {
	AddTrackProps,
	ConnectPeerConnectionProps,
	createSdpProps,
	RegisterIceProps,
	RegisterSdpProps,
} from '../type/peerConnection.js';
import { StreamType } from '../type/signal.js';

import { mediaManager } from './mediaManager.js';

export const peerConnectionManager = () => {
	const peerConnection = new Map<string, RTCPeerConnection>();
	const screenPeerConnection = new Map<string, RTCPeerConnection>();

	const { addParticipantsTracks, registerTrack } = mediaManager();

	const connectPeerConnection = async ({ client, id, ownerId, roomId, streamType }: ConnectPeerConnectionProps) => {
		const { sendIce, sendMid } = signalSender({ client });
		const connection = streamType === 'SCREEN' ? screenPeerConnection.get(id) : peerConnection.get(id);

		if (connection) {
			return;
		}

		const pc = new wrtc.RTCPeerConnection({
			iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
		});

		pc.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
			if (!e.candidate) {
				return;
			}
			const payload = {
				ice: JSON.stringify(e.candidate),
				id,
				streamType,
			};
			sendIce(payload);
		};

		pc.ontrack = async (e: RTCTrackEvent) => {
			const mid = await registerTrack(streamType, id, roomId, e.track, pc, ownerId);
			const payload = {
				id,
				mid,
			};
			sendMid(payload);
		};

		if (streamType === 'USER') {
			const mid = await addParticipantsTracks(pc, roomId);
			const payload = {
				id,
				mid,
			};
			sendMid(payload);
			peerConnection.set(id, pc);
			return;
		}
		peerConnection.set(id, pc);
	};

	const registerSdp = async ({ id, sdp, streamType }: RegisterSdpProps) => {
		const pc = getPeerConnection(id, streamType);
		await pc.setLocalDescription(sdp);
	};

	const createSdp = async ({ id, streamType }: createSdpProps) => {
		const pc = getPeerConnection(id, streamType);
		const sdp = await pc.createAnswer();
		return sdp;
	};

	const addTrack = ({ id, stream, streamType, track }: AddTrackProps) => {
		const pc = getPeerConnection(id, streamType);
		if (stream) {
			pc.addTrack(track, stream);
			return;
		}
		pc.addTrack(track);
	};

	const registerIce = async ({ ice, id, streamType }: RegisterIceProps) => {
		const pc = getPeerConnection(id, streamType);
		pc.addIceCandidate(ice);
	};

	const getPeerConnection = (id: string, streamType: StreamType) => {
		const pc = streamType === 'SCREEN' ? screenPeerConnection.get(id) : peerConnection.get(id);

		if (!pc) {
			throw new Error('존재하지 않는 peerConnection입니다.');
		}
		return pc;
	};

	return { addTrack, connectPeerConnection, createSdp, registerIce, registerSdp };
};
