import { StreamType } from './signal.js';

export type PeerConnectionType = Record<string, RTCPeerConnection>;

interface PeerConnectionInit {
	userId: string;
	streamType: StreamType;
}

export interface ConnectPeerConnectionProps extends PeerConnectionInit {
	onIcecandidate?: () => void;
	onTrack?: () => void;
}

export interface RegisterSdpProps extends PeerConnectionInit {
	sdp: RTCSessionDescriptionInit;
}

export interface createSdpProps extends PeerConnectionInit {}

export interface AddTrackProps extends PeerConnectionInit {
	track: MediaStreamTrack;
	stream?: MediaStream;
}

export interface RegisterIceProps extends PeerConnectionInit {
	ice: RTCIceCandidateInit;
}
