import { Client } from '@stomp/stompjs';

import { signalSender } from '../signaling/signerSender.js';
import {
	getParticipant,
	getPeerConnection,
	getUserMedia,
	isScreenTrackId,
	removeScreenTrackId,
	removeUserTrack,
	updateUserMedia,
} from '../store/index.js';
import { OfferPayloadType } from '../type/signal.js';

interface MediaManagerProps {
	client: Client;
}
export const mediaManager = ({ client }: MediaManagerProps) => {
	const registerOtherTracks = async (roomId: string, pc: RTCPeerConnection) => {
		const participant = await getParticipant(roomId);
		console.log(participant);

		if (!participant || participant.size === 0) {
			return;
		}

		await Promise.all(
			Array.from(participant).map(async (userId) => {
				const media = await getUserMedia(userId);
				media.audioTrack && pc.addTrack(media.audioTrack);
				media.videoTrack && pc.addTrack(media.videoTrack);
				media.screenAudioTrack && pc.addTrack(media.screenAudioTrack);
				media.screenVideoTrack && pc.addTrack(media.screenVideoTrack);
			}),
		);
	};

	const registerOwnerTrack = async (id: string, roomId: string, track: MediaStreamTrack) => {
		const { sendOffer } = signalSender({ client });
		const streamType = (await isScreenTrackId(track.id)) ? 'SCREEN' : 'USER';
		await updateUserMedia(id, streamType, track);

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
				pc.pc.addTrack(track);

				const sdp = await pc.pc.createOffer();
				const payload: OfferPayloadType = {
					sdp: JSON.stringify(sdp),
					userId,
				};
				sendOffer(payload);

				/* send signal(trackId: userId ) */
			}),
		);

		track.onended = async () => {
			removeUserTrack(id, streamType, track.kind);
			if (streamType === 'SCREEN') {
				await removeScreenTrackId(track.id);
			}
		};
	};

	return { registerOtherTracks, registerOwnerTrack };
};
