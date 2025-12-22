import {
	deleteTransceiver,
	getParticipant,
	getPeerConnection,
	getTransceiver,
	getUserTrackInfo,
	setTransceiver,
} from '@/store/index.js';
import { TrackType } from '@/type/media.js';
import { DeviceTransceiverType } from '@/type/peerConnection.js';
import { TrackInfoType } from '@/type/signal.js';

export const mediaManager = () => {
	const getUserTransceiverTrackInfo = async (userId: string) => {
		const transceivers = (await getTransceiver(userId)) as Map<string, DeviceTransceiverType> | undefined;
		if (!transceivers) {
			return null;
		}

		await deleteTransceiver(userId);

		const entries = Array.from(transceivers.entries()).flatMap(([targetId, deviceMap]) =>
			Object.entries(deviceMap)
				.filter(([_, t]) => typeof t?.mid === 'string')
				.map(
					([deviceType, t]) =>
						[
							t!.mid!,
							{
								trackType: deviceType,
								userId: targetId,
							},
						] as [string, TrackInfoType],
				),
		);

		return Object.fromEntries(entries);
	};

	const registerTrackToOther = async (
		ownerId: string,
		otherId: string,
		track: MediaStreamTrack,
		trackType: TrackType,
	) => {
		if (ownerId === otherId || !isLiveTrack(track)) {
			return;
		}

		const pcData = await getPeerConnection(otherId);
		if (!pcData) {
			return;
		}

		const transceiver = pcData.pc.addTransceiver(track.kind, { direction: 'sendonly' });
		await transceiver.sender.replaceTrack(track);
		await setTransceiver(otherId, ownerId, { [trackType]: transceiver });
	};

	const registerOtherTracks = async (userId: string, roomId: string, pc: RTCPeerConnection) => {
		const participants = await getParticipant(roomId);
		if (!participants?.size) {
			return;
		}

		await Promise.all(
			Array.from(participants).map((participant) => registerTracksFromParticipant(userId, participant, pc)),
		);
	};

	const registerTracksFromParticipant = async (userId: string, participantId: string, pc: RTCPeerConnection) => {
		if (userId === participantId) return;

		const tracks = (await getUserTrackInfo(participantId)) as Map<string, TrackInfoType>;
		const participantPc = await getPeerConnection(participantId);
		if (!participantPc || !tracks) {
			return;
		}

		for (const [mid, trackInfo] of tracks) {
			const participantTraskceiver = participantPc.pc.getTransceivers().find((t) => t.mid === mid);

			const track = participantTraskceiver?.receiver.track;
			if (!track || !isLiveTrack(track)) {
				continue;
			}

			const transceiver = pc.addTransceiver(track.kind, { direction: 'sendonly' });
			await transceiver.sender.replaceTrack(track);
			await setTransceiver(userId, participantId, { [trackInfo.trackType]: transceiver });
		}
	};

	const isLiveTrack = (track: MediaStreamTrack) => {
		if (track.readyState === 'live' && track.enabled) {
			return true;
		}
		return false;
	};

	return { getUserTransceiverTrackInfo, registerOtherTracks, registerTrackToOther };
};
