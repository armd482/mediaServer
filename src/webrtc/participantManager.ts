import { createMutex } from '../lib/roomMutex.js';

export const participantManager = () => {
	const participants = new Map<string, Set<string>>();
	const { runExclusive } = createMutex();

	const getParticipant = (roomId: string) => {
		if (!participants.has(roomId)) {
			participants.set(roomId, new Set());
		}
		return participants.get(roomId);
	};

	const addParticipant = async (roomId: string, userId: string) => {
		await runExclusive(() => {
			getParticipant(roomId)?.add(userId);
		});
	};

	const removeParticipant = async (roomId: string, userId: string) => {
		await runExclusive(() => {
			const participant = getParticipant(roomId);
			participant?.delete(userId);
			if (participant?.size === 0) {
				participants.delete(roomId);
			}
		});
	};

	return { addParticipant, getParticipant, removeParticipant };
};
