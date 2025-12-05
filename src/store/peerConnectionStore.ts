const peerConnectionsStore = new Map<string, RTCPeerConnection>();

export const getPeer = async (userId: string) => {
	try {
		return peerConnectionsStore.get(userId);
	} catch {
		return;
	}
};
export const addPeer = async (userId: string, pc: RTCPeerConnection) => {
	peerConnectionsStore.set(userId, pc);
};

export const removePeer = async (userId: string) => {
	peerConnectionsStore.delete(userId);
};
