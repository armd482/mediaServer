import { createMutex } from '../lib/roomMutex.js';
import { TrackInfoType } from '../type/media.js';
import { DeviceTransceiverType, ServerPeerConnectionData } from '../type/peerConnection.js';

import { getParticipants, addParticipants, removeParticipants } from './participantStore.js';
import { addPeer, removePeer, getPeer, updatePeer } from './peerConnectionStore.js';
import { getUserTrackInfoStore, updateUserTrackInfoStore, removeTrackInfoStore } from './trackStore.js';
import { deleteTransceiverStore, getTransceiverStore, setTransceiverStore } from './transceiverStore.js';

export const { runExclusive } = createMutex();

export const getParticipant = (roomId: string) => runExclusive(async () => getParticipants(roomId));
export const addParticipant = (roomId: string, userId: string) =>
	runExclusive(async () => addParticipants(roomId, userId));
export const removeParticipant = (roomId: string, userId: string) =>
	runExclusive(async () => removeParticipants(roomId, userId));

export const addPeerConnection = (userId: string, pc: RTCPeerConnection) =>
	runExclusive(async () => addPeer(userId, pc));
export const getPeerConnection = (userId: string) => runExclusive(async () => getPeer(userId));
export const removePeerConnection = (userId: string) => runExclusive(async () => removePeer(userId));
export const updatePeerConnection = (userId: string, data: Partial<ServerPeerConnectionData>) =>
	runExclusive(async () => updatePeer(userId, data));

export const getUserTrackInfo = (userId: string, mid?: string) =>
	runExclusive(async () => getUserTrackInfoStore(userId, mid));
export const updateUserTrackInfo = (userId: string, mid: string, value: TrackInfoType) =>
	runExclusive(async () => updateUserTrackInfoStore(userId, mid, value));
export const removeUserTrackInfo = (userId: string, mid?: string) =>
	runExclusive(async () => removeTrackInfoStore(userId, mid));

export const getTransceiver = async (toUserId: string, fromUserId?: string) =>
	runExclusive(async () => getTransceiverStore(toUserId, fromUserId));
export const setTransceiver = async (toUserId: string, fromUserId: string, value: Partial<DeviceTransceiverType>) =>
	runExclusive(async () => setTransceiverStore(toUserId, fromUserId, value));
export const deleteTransceiver = async (toUserId: string, fromUserId?: string) =>
	runExclusive(async () => deleteTransceiverStore(toUserId, fromUserId));
