import { Client } from '@stomp/stompjs';

import { signalSender } from '../signaling/signerSender.js';
import {
	getParticipant,
	getPeerConnection,
	getUserMedia,
	isScreenTrackId,
	removeScreenTrackId,
	removeUserTrack,
	updatePeerConnection,
	updateUserMedia,
} from '../store/index.js';
import { OfferPayloadType } from '../type/signal.js';

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
		const participant = await getParticipant(roomId);

		if (!participant || participant.size === 0) {
			return;
		}

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
				}

				if (videoTrack) {
					console.log('add videoTrack');
					pc.addTrack(videoTrack, mediaStream);
				}

				if (screenAudioTrack) {
					pc.addTrack(screenAudioTrack, mediaStream);
				}

				if (screenVideoTrack) {
					pc.addTrack(screenVideoTrack, mediaStream);
				}
			}),
		);
	};

	const registerOwnerTrack = async (id: string, roomId: string, event: RTCTrackEvent) => {
		const streamType = (await isScreenTrackId(event.track.id)) ? 'SCREEN' : 'USER';
		await updateUserMedia(id, streamType, event.track, event.streams[0]);

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

				const senderExists = pc.pc.getSenders().some((s) => s.track?.id === event.track.id);
				if (!senderExists) pc.pc.addTrack(event.track, event.streams[0]);

				/* send signal(trackId: userId ) */
			}),
		);

		event.track.onended = async () => {
			removeUserTrack(id, streamType, event.track.kind);
			if (streamType === 'SCREEN') {
				await removeScreenTrackId(event.track.id);
			}
		};
	};

	return { negotiation, registerOtherTracks, registerOwnerTrack };
};
