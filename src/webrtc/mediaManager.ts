import { Client } from '@stomp/stompjs';

import { signalSender } from '../signaling/signerSender.js';
import {
	getParticipant,
	getPeerConnection,
	getUserMedia,
	removeUserTrack,
	setTransceiver,
	updatePeerConnection,
	updateUserMedia,
} from '../store/index.js';
import { StreamType } from '../type/media.js';
import { OfferPayloadType } from '../type/signal.js';
import { getTrackType } from '../util/trackType.js';

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

	const addTransceiver = async (
		pc: RTCPeerConnection,
		track: MediaStreamTrack,
		fromUserId: string,
		toUserId: string,
		streamType: StreamType,
	) => {
		const transceiver = pc.addTransceiver(track, { direction: 'sendonly' });
		const key = getTrackType(streamType, track.kind);
		await setTransceiver(toUserId, fromUserId, { [key]: transceiver });
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
				const { audio, screenAudio, screenVideo, video } = await getUserMedia(user);
				console.log(user, 'trackInfo', audio, video);

				if (audio) {
					addTransceiver(pc, audio, user, userId, 'USER');
				}

				if (video) {
					addTransceiver(pc, video, user, userId, 'USER');
				}

				if (screenAudio) {
					addTransceiver(pc, screenAudio, user, userId, 'SCREEN');
				}

				if (screenVideo) {
					addTransceiver(pc, screenVideo, user, userId, 'SCREEN');
				}
			}),
		);
	};

	const registerOwnerTrack = async (id: string, roomId: string, track: MediaStreamTrack, streamType: StreamType) => {
		await updateUserMedia(id, streamType, track);
		track.onended = async () => {
			removeUserTrack(id, streamType, track.kind);
		};

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

				addTransceiver(pc.pc, track, id, userId, streamType);
			}),
		);
	};

	return { negotiation, registerOtherTracks, registerOwnerTrack };
};
