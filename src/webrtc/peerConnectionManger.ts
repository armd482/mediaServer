import { Client } from '@stomp/stompjs';
import wrtc from 'wrtc';

import { signalSender } from '../signaling/signerSender.js';
import {
	addParticipant,
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
	CreateSdpProps,
	RegisterIceProps,
	RegisterLocalSdpProps,
	RegisterRemoteSdpProps,
} from '../type/peerConnection.js';

import { mediaManager } from './mediaManager.js';

interface PeerConnectionManagerProps {
	client: Client;
}

export const peerConnectionManager = ({ client }: PeerConnectionManagerProps) => {
	const { registerOtherTracks, registerOwnerTrack } = mediaManager({
		client,
	});

	const connectPeerConnection = async ({ roomId, sdp, userId }: ConnectPeerConnectionProps) => {
		const { sendIce } = signalSender({ client });
		const connection = await getPeerConnection(userId);

		if (connection) {
			return;
		}

		const pc = new wrtc.RTCPeerConnection({
			iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
		});

		pc.setRemoteDescription(sdp);

		await registerOtherTracks(roomId, pc);
		await addParticipant(roomId, userId);

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
			registerOwnerTrack(userId, roomId, e.track);
			console.log(e);
		};

		await addPeerConnection(userId, pc);
		return;
	};

	const registerRemoteSdp = async ({ sdp, userId }: RegisterRemoteSdpProps) => {
		const data = await getPeerConnection(userId);
		if (!data) {
			return;
		}
		await data.pc.setRemoteDescription(sdp);
	};

	const createSdp = async ({ userId }: CreateSdpProps) => {
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
		await removeParticipant(roomId, id);
		await removeUserMedia(id);
	};
	return {
		addTrack,
		closePeerConnection,
		connectPeerConnection,
		createSdp,
		registerIce,
		registerLocalSdp,
		registerRemoteSdp,
	};
};
