import { Client } from '@stomp/stompjs';

import { signalSender } from '../signaling/signerSender.js';
import {
	getParticipant,
	getPeerConnection,
	getUserMedia,
	removeUserTrack,
	updatePeerConnection,
	updateUserMedia,
} from '../store/index.js';
import { StreamType } from '../type/media.js';
import { OfferPayloadType, TrackInfoType, TrackPayloadType } from '../type/signal.js';

interface MediaManagerProps {
	client: Client;
}
export const mediaManager = ({ client }: MediaManagerProps) => {
	const negotiation = async (userId: string) => {
		const { sendOffer } = signalSender({ client });
		const data = await getPeerConnection(userId);
		if (!data || data.makingOffer || data.pc.signalingState !== 'stable') {
			return;
		}

		await updatePeerConnection(userId, { makingOffer: true });
		const { pc } = data;
		const offerSdp = await pc.createOffer();
		await pc.setLocalDescription(offerSdp);
		const payload: OfferPayloadType = {
			sdp: JSON.stringify(offerSdp),
			userId,
		};
		sendOffer(payload);
	};

	const registerOtherTracks = async (userId: string, roomId: string, pc: RTCPeerConnection) => {
		const { sendTrack } = signalSender({ client });
		const participant = await getParticipant(roomId);

		if (!participant || participant.size === 0) {
			return;
		}

		const trackInfo = new Map<string, TrackInfoType>();

		await Promise.all(
			Array.from(participant).map(async (user) => {
				if (userId === user) {
					return;
				}
				const { audioTrack, mediaStream, screenAudioTrack, screenVideoTrack, videoTrack } = await getUserMedia(user);
				if (!mediaStream) {
					return;
				}
				if (audioTrack) {
					console.log('add audioTrack');
					pc.addTrack(audioTrack, mediaStream);
					trackInfo.set(audioTrack.id, { type: 'USER', userId: user });
				}

				if (videoTrack) {
					console.log('add videoTrack');
					pc.addTrack(videoTrack, mediaStream);
					trackInfo.set(videoTrack.id, { type: 'USER', userId: user });
				}

				if (screenAudioTrack) {
					pc.addTrack(screenAudioTrack, mediaStream);
					trackInfo.set(screenAudioTrack.id, { type: 'SCREEN', userId: user });
				}

				if (screenVideoTrack) {
					pc.addTrack(screenVideoTrack, mediaStream);
					trackInfo.set(screenVideoTrack.id, { type: 'SCREEN', userId: user });
				}
			}),
		);

		if (trackInfo.size === 0) {
			return;
		}
		const payload: TrackPayloadType = {
			track: Object.fromEntries(trackInfo),
			userId,
		};

		sendTrack(payload);
	};

	const registerOwnerTrack = async (
		id: string,
		roomId: string,
		track: MediaStreamTrack,
		mediaStream: MediaStream,
		streamType: StreamType,
	) => {
		const { sendTrack } = signalSender({ client });
		await updateUserMedia(id, streamType, track, mediaStream);

		const participant = await getParticipant(roomId);

		if (!participant) {
			return;
		}

		await Promise.all(
			Array.from(participant).map(async (userId) => {
				if (userId === id) {
					return;
				}

				const pc = await getPeerConnection(userId);
				if (!pc) {
					return;
				}

				const senderExists = pc.pc.getSenders().some((s) => s.track?.id === track.id);
				if (!senderExists) pc.pc.addTrack(track, mediaStream);

				const payload: TrackPayloadType = {
					track: {
						[track.id]: {
							type: streamType,
							userId: id,
						},
					},
					userId,
				};
				sendTrack(payload);
			}),
		);

		track.onended = async () => {
			removeUserTrack(id, streamType, track.kind);
		};
	};

	return { negotiation, registerOtherTracks, registerOwnerTrack };
};
