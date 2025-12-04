export const participantManager = () => {
	const participants = new Map<string, Set<string>>();

	const getParticipant = (roomId: string) => {
		if (!participants.has(roomId)) {
			participants.set(roomId, new Set());
		}
		return participants.get(roomId);
	};

	const addParticipant = (roomId: string, userId: string) => {
		getParticipant(roomId)?.add(userId);
	};

	const removeParticipant = (roomId: string, userId: string) => {
		const participant = getParticipant(roomId);
		participant?.delete(userId);
		if (participant?.size === 0) {
			participants.delete(roomId);
		}
	};

	return { addParticipant, getParticipant, removeParticipant };
};
