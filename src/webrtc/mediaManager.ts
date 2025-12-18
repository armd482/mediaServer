import WebSocket from 'ws';

import { signalSender } from '../signaling/signerSender.js';
import {
	deleteTransceiver,
	getParticipant,
	getPeerConnection,
	getTransceiver,
	getUserTrackInfo,
	removeUserTrackInfo,
	setTransceiver,
	updatePeerConnection,
} from '../store/index.js';
import { TrackType } from '../type/media.js';
import { DeviceTransceiverType } from '../type/peerConnection.js';
import { OfferPayloadType, TrackInfoType } from '../type/signal.js';

interface MediaManagerProps {
	client: WebSocket;
}
export const mediaManager = ({ client }: MediaManagerProps) => {
	const handleNegotiation = async (userId: string) => {
		const { sendOffer } = signalSender({ client });
		const data = await getPeerConnection(userId);
		if (!data || data.makingOffer) {
			return;
		}

		await updatePeerConnection(userId, { makingOffer: true, remoteSet: false });
		const { pc } = data;
		const offerSdp = await pc.createOffer();
		await pc.setLocalDescription(offerSdp);
		console.log('register offer');

		const transceiver = (await getTransceiver(userId)) as Map<string, DeviceTransceiverType>;

		const transceivers = Array.from(transceiver.entries()).flatMap(([targetId, deviceTransceiver]) =>
			Object.entries(deviceTransceiver)
				.filter(([_, t]) => typeof t?.mid === 'string')
				.map(
					([deviceType, t]) =>
						[
							t?.mid,
							{
								trackType: deviceType,
								userId: targetId,
							},
						] as [string, TrackInfoType],
				),
		);
		const trackInfo = Object.fromEntries(transceivers);
		const payload: OfferPayloadType = {
			sdp: JSON.stringify(offerSdp),
			trackInfo,
			userId,
		};
		sendOffer(payload);
		await deleteTransceiver(userId);
	};

	const addTransceiver = async (
		pc: RTCPeerConnection,
		track: MediaStreamTrack,
		fromUserId: string,
		toUserId: string,
		trackType: TrackType,
	) => {
		console.log('addOtherTrack');
		const transceiver = pc.addTransceiver(track.kind, { direction: 'sendonly' });
		await transceiver.sender.replaceTrack(track);
		await setTransceiver(toUserId, fromUserId, { [trackType]: transceiver });
	};

	const handleTrack = async (userId: string, roomId: string, e: RTCTrackEvent) => {
		const track = e.track;
		const mid = e.transceiver.mid;
		if (!track || track?.readyState !== 'live' || !mid) {
			return;
		}

		const trackInfo = (await getUserTrackInfo(userId, mid)) as TrackInfoType;

		if (!trackInfo) {
			return;
		}

		track.onended = async () => {
			removeUserTrackInfo(userId, mid);
		};

		const participant = await getParticipant(roomId);

		if (!participant) {
			return;
		}

		await Promise.all(
			Array.from(participant).map(async (user) => {
				if (userId === user) {
					return;
				}

				const pc = await getPeerConnection(user);
				if (!pc) {
					return;
				}

				addTransceiver(pc.pc, track, userId, user, trackInfo.trackType);
			}),
		);
	};

	const registerOtherTracks = async (userId: string, roomId: string, pc: RTCPeerConnection) => {
		const participant = await getParticipant(roomId);
		if (!participant || participant.size === 0) return;

		await Promise.all(
			Array.from(participant).map(async (user) => {
				if (userId === user) return;

				const tracks = (await getUserTrackInfo(user)) as Map<string, TrackInfoType>;
				const participantPc = await getPeerConnection(user);
				if (!participantPc) return;

				for (const [mid, trackInfo] of tracks) {
					const transceiver = participantPc.pc.getTransceivers().find((t) => t.mid === mid);

					const track = transceiver?.receiver.track;
					if (!track || track.readyState !== 'live') continue;

					await addTransceiver(pc, track, user, userId, trackInfo.trackType);
				}
			}),
		);
	};

	return { handleNegotiation, handleTrack, registerOtherTracks };
};
