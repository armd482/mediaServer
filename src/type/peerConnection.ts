export interface ServerPeerConnectionData {
	pc: RTCPeerConnection;
	remoteSet: boolean;
	iceQueue: RTCIceCandidateInit[];
}

export type PeerConnectionType = Record<string, RTCPeerConnection>;

export interface PeerConnectionInit {
	userId: string;
}

export interface ConnectPeerConnectionProps extends PeerConnectionInit {
	roomId: string;
	sdp: RTCSessionDescriptionInit;
}

export interface RegisterRemoteSdpProps extends PeerConnectionInit {
	sdp: RTCSessionDescriptionInit;
}

export interface CreateSdpProps extends PeerConnectionInit {}

export interface RegisterLocalSdpProps extends PeerConnectionInit {
	sdp: RTCSessionDescriptionInit;
}

export interface AddTrackProps extends PeerConnectionInit {
	track: MediaStreamTrack;
	stream?: MediaStream;
}

export interface RegisterIceProps extends PeerConnectionInit {
	ice: RTCIceCandidateInit;
}

export interface ClosePeerConnectionProps {
	id: string;
	roomId: string;
}
