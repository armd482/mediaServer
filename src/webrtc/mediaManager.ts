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

		await updatePeerConnection(userId, { makingOffer: true, remoteSet: false });
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
				const { audioTrack, screenAudioTrack, screenVideoTrack, videoTrack } = await getUserMedia(user);
				console.log(user, 'trackInfo', audioTrack, videoTrack);
				if (videoTrack) {
					console.log('add videoTrack');
					pc.addTransceiver(videoTrack);
					trackInfo.set(videoTrack.id, { streamType: 'USER', userId: user });
				}

				if (audioTrack) {
					console.log('add audioTrack');
					pc.addTransceiver(audioTrack);
					trackInfo.set(audioTrack.id, { streamType: 'USER', userId: user });
				}

				if (screenAudioTrack) {
					pc.addTransceiver(screenAudioTrack);
					trackInfo.set(screenAudioTrack.id, { streamType: 'SCREEN', userId: user });
				}

				if (screenVideoTrack) {
					pc.addTransceiver(screenVideoTrack);
					trackInfo.set(screenVideoTrack.id, { streamType: 'SCREEN', userId: user });
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

	const registerOwnerTrack = async (id: string, roomId: string, track: MediaStreamTrack, streamType: StreamType) => {
		const { sendTrack } = signalSender({ client });
		await updateUserMedia(id, streamType, track);

		const participant = await getParticipant(roomId);

		console.log('registering');

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

				pc.pc.addTransceiver(track);

				const payload: TrackPayloadType = {
					track: {
						[track.id]: {
							streamType,
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
