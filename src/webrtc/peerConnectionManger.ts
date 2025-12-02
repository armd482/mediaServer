import wrtc from 'wrtc';

import { StreamType } from '../type/signal.js';

export const peerConnectionManager = () => {
	const peerConnection = new Map<string, RTCPeerConnection>();
	const screenPeerConnection = new Map<string, RTCPeerConnection>();

	const connectPeerConnection = (
		id: string,
		streamType: StreamType,
		onIcecandidate?: () => void,
		onTrack?: () => void,
	) => {
		const connection = streamType === 'SCREEN' ? screenPeerConnection.get(id) : peerConnection.get(id);

		if (connection) {
			return;
		}

		const pc = new wrtc.RTCPeerConnection({
			iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
		});

		pc.onicecandidate = onIcecandidate?.();
		pc.ontrack = onTrack?.();

		if (streamType === 'USER') {
			peerConnection.set(id, pc);
			return;
		}

		peerConnection.set(id, pc);
	};

	const registerSdp = async (id: string, streamType: StreamType, sdp: RTCSessionDescriptionInit) => {
		const pc = getPeerConnection(id, streamType);
		await pc.setLocalDescription(sdp);
	};

	const createSdp = async (id: string, streamType: StreamType) => {
		const pc = getPeerConnection(id, streamType);
		const sdp = await pc.createAnswer();
		return sdp;
	};

  const addTrack = (id: string, streamType: StreamType, track: MediaStreamTrack, stream?: MediaStream) => {
    const pc =  getPeerConnection(id, streamType);
    if(stream) {
      pc.addTrack(track, stream);
      return;
    }
    pc.addTrack(track);
  }

	const getPeerConnection = (id: string, streamType: StreamType) => {
		const pc = streamType === 'SCREEN' ? screenPeerConnection.get(id) : peerConnection.get(id);

		if (!pc) {
			throw new Error('존재하지 않는 peerConnection입니다.');
		}
		return pc;
	};

	return { connectPeerConnection, createSdp, registerSdp, addTrack };
};
