import { ServerPeerConnectionData } from '../type/peerConnection.js';

const peerConnectionsStore = new Map<string, ServerPeerConnectionData>();

export const addPeer = (userId: string, pc: RTCPeerConnection) => {
	peerConnectionsStore.set(userId, {
		iceQueue: [],
		pc,
		remoteSet: false,
	});
};

export const getPeer = (userId: string) => peerConnectionsStore.get(userId);

export const updatePeer = (userId: string, data: Partial<ServerPeerConnectionData>) => {
	const current = peerConnectionsStore.get(userId);
	if (!current) return;
	peerConnectionsStore.set(userId, { ...current, ...data });
};

export const removePeer = (userId: string) => {
	peerConnectionsStore.get(userId)?.pc.close();
	peerConnectionsStore.delete(userId);
};
