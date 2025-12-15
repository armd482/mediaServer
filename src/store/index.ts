import { createMutex } from '../lib/roomMutex.js';
import { PendingTrackEntry, StreamType } from '../type/media.js';
import { DeviceTransceiverType, ServerPeerConnectionData } from '../type/peerConnection.js';

import { getParticipants, addParticipants, removeParticipants } from './participantStore.js';
import { addPeer, removePeer, getPeer, updatePeer } from './peerConnectionStore.js';
import {
	getMedia,
	updateMedia,
	removeMedia,
	removeTrack,
	getPendingTrackStore,
	setPendingTrackStore,
	deletePendingTrackStore,
} from './trackStore.js';
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

export const getUserMedia = (userId: string) => runExclusive(async () => getMedia(userId));
export const updateUserMedia = (userId: string, streamType: StreamType, track: MediaStreamTrack) =>
	runExclusive(async () => updateMedia(userId, streamType, track));
export const removeUserTrack = (userId: string, streamType: StreamType, trackKind: string) =>
	runExclusive(async () => removeTrack(userId, streamType, trackKind));
export const removeUserMedia = (userId: string) => runExclusive(async () => removeMedia(userId));

export const getPendingTrack = async (userId: string, mid?: string) =>
	runExclusive(async () => getPendingTrackStore(userId, mid));
export const setPendingTrack = async (userId: string, mid: string, entry: Partial<PendingTrackEntry>) =>
	runExclusive(async () => setPendingTrackStore(userId, mid, entry));
export const deletePendingTrack = async (userId: string, mid: string) =>
	runExclusive(async () => deletePendingTrackStore(userId, mid));

export const getTransceiver = async (toUserId: string, fromUserId?: string) =>
	runExclusive(async () => getTransceiverStore(toUserId, fromUserId));
export const setTransceiver = async (toUserId: string, fromUserId: string, value: Partial<DeviceTransceiverType>) =>
	runExclusive(async () => setTransceiverStore(toUserId, fromUserId, value));
export const deleteTransceiver = async (toUserId: string, fromUserId?: string) =>
	runExclusive(async () => deleteTransceiverStore(toUserId, fromUserId));
