const participantsStore = new Map<string, Set<string>>();

export const getParticipants = async (roomId: string) => {
	if (!participantsStore.has(roomId)) {
		participantsStore.set(roomId, new Set());
	}
	return participantsStore.get(roomId)!;
};

export const addParticipants = async (roomId: string, userId: string) => {
	if (!participantsStore.has(roomId)) {
		participantsStore.set(roomId, new Set());
	}
	participantsStore.get(roomId)!.add(userId);
};

export const removeParticipants = async (roomId: string, userId: string) => {
	const participant = participantsStore.get(roomId);
	participant?.delete(userId);
	if (participant?.size === 0) {
		participantsStore.delete(roomId);
	}
};
