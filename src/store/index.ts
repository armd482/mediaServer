import { createMutex } from '../lib/roomMutex.js';
import { StreamType } from '../type/media.js';
import { ServerPeerConnectionData } from '../type/peerConnection.js';

import { getParticipants, addParticipants, removeParticipants } from './participantStore.js';
import { addPeer, removePeer, getPeer, updatePeer } from './peerConnectionStore.js';
import {
	getMedia,
	updateMedia,
	removeMedia,
	isScreenTrack,
	addScreenTrack,
	removeScreenTrack,
	removeTrack,
} from './trackStore.js';
import { getTransceiver, removePeerTransceiver, removeTransceiver } from './transceiverStore.js';

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

export const isScreenTrackId = (id: string) => runExclusive(async () => isScreenTrack(id));
export const addScreenTrackId = (id: string) => runExclusive(async () => addScreenTrack(id));
export const removeScreenTrackId = (id: string) => runExclusive(async () => removeScreenTrack(id));

export const getUserPeerTransceiver = (userId: string) => runExclusive(async () => getTransceiver(userId));
export const removeUserTransceiver = (userId: string) => runExclusive(async () => removeTransceiver(userId));
export const removeUserPeerTransceiver = (userId: string, peerUserId: string) =>
	runExclusive(async () => removePeerTransceiver(userId, peerUserId));
