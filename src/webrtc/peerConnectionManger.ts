import wrtc from 'wrtc';
import WebSocket from 'ws';

import { signalSender } from '../signaling/signerSender.js';
import {
	addPeerConnection,
	getParticipant,
	getPeerConnection,
	getUserTrackInfo,
	removeParticipant,
	removePeerConnection,
	removeUserTrackInfo,
	updatePeerConnection,
} from '../store/index.js';
import { TrackInfoType, TrackType } from '../type/media.js';
import {
	ClosePeerConnectionProps,
	CreatePeerConnectionProps,
	RegisterIceProps,
	RegisterRemoteSdpProps,
} from '../type/peerConnection.js';
import { OfferPayloadType } from '../type/signal.js';

import { mediaManager } from './mediaManager.js';

interface PeerConnectionManagerProps {
	client: WebSocket;
}

export const peerConnectionManager = ({ client }: PeerConnectionManagerProps) => {
	const { sendIce, sendOffer } = signalSender({ client });
	const { getUserTransceiverTrackInfo, registerOtherTracks, registerTrackToOther } = mediaManager();

	const createPeerConnection = async ({ roomId, userId }: CreatePeerConnectionProps) => {
		const pc: RTCPeerConnection = new wrtc.RTCPeerConnection({
			iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
		});

		pc.onicecandidate = async (e: RTCPeerConnectionIceEvent) => await handleIce(userId, e);
		pc.onnegotiationneeded = async () => await handleNegotiation(userId);
		pc.ontrack = async (e) => handleTrack(userId, roomId, e);

		await initPeerConnection(pc, userId, roomId);
		return pc;
	};

	const registerAnswerSdp = async ({ sdp, userId }: RegisterRemoteSdpProps) => {
		const data = await getPeerConnection(userId);
		if (!data || data.pc.signalingState !== 'have-local-offer') {
			return;
		}

		await data.pc.setRemoteDescription(sdp);
	};

	const registerRemoteIce = async ({ ice, userId }: RegisterIceProps) => {
		const data = await getPeerConnection(userId);
		if (!data) return;

		data.pc.addIceCandidate(ice);
	};

	const closePeerConnection = async ({ roomId, userId }: ClosePeerConnectionProps) => {
		const data = await getPeerConnection(userId);
		if (!data) {
			return;
		}

		data.pc.close();
		await removePeerConnection(userId);
		await removeParticipant(roomId, userId);
		await removeUserTrackInfo(userId);
	};

	const handleIce = async (userId: string, e: RTCPeerConnectionIceEvent) => {
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

	const handleNegotiation = async (userId: string) => {
		const data = await getPeerConnection(userId);
		if (!data || data.pc.signalingState !== 'stable') {
			return;
		}

		if (data.negotiationTimer) {
			clearTimeout(data.negotiationTimer);
		}
		const timer = setTimeout(async () => {
			createAndSendOffer(userId);
		}, 100);

		await updatePeerConnection(userId, { negotiationTimer: timer });
	};

	const createAndSendOffer = async (userId: string) => {
		const data = await getPeerConnection(userId);
		if (!data || data.makingOffer || data.pc.signalingState !== 'stable') {
			return;
		}

		await updatePeerConnection(userId, { makingOffer: true, negotiationTimer: null, remoteSet: false });
		const offerSdp = await data.pc.createOffer();
		await data.pc.setLocalDescription(offerSdp);

		const trackInfo = await getUserTransceiverTrackInfo(userId);
		if (!trackInfo) {
			return;
		}
		const payload: OfferPayloadType = {
			sdp: JSON.stringify(offerSdp),
			trackInfo,
			userId,
		};

		sendOffer(payload);
	};

	const handleTrack = async (userId: string, roomId: string, e: RTCTrackEvent) => {
		const track = e.track;
		const mid = e.transceiver.mid as string;

		const participants = await getParticipant(roomId);

		if (!participants) {
			return;
		}

		const trackInfo = ((await getUserTrackInfo(userId, mid)) as TrackInfoType)?.trackType as TrackType;

		track.onended = async () => {
			removeUserTrackInfo(userId, mid);
		};

		await Promise.allSettled(
			Array.from(participants).map(async (participant) => {
				registerTrackToOther(userId, participant, track, trackInfo);
			}),
		);
	};

	const initPeerConnection = async (pc: RTCPeerConnection, userId: string, roomId: string) => {
		registerInitTranseiver(pc);
		await registerOtherTracks(userId, roomId, pc);
		await addPeerConnection(userId, pc);
	};

	const registerInitTranseiver = (pc: RTCPeerConnection) => {
		//camera, mic Transceiver
		pc.addTransceiver('audio', { direction: 'recvonly' });
		pc.addTransceiver('video', { direction: 'recvonly' });

		//screen Transceiver
		pc.addTransceiver('audio', { direction: 'recvonly' });
		pc.addTransceiver('video', { direction: 'recvonly' });
	};
	return {
		closePeerConnection,
		createPeerConnection,
		handleNegotiation,
		registerAnswerSdp,
		registerRemoteIce,
	};
};
