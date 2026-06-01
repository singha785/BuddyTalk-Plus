import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useSocket, type MatchedPartner } from "@/context/SocketContext";

const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
];

type WebRTCCallbacks = {
  onRemoteStream?: (stream: MediaStream) => void;
  onCallEnded?: () => void;
};

export type WebRTCHandle = {
  startCall: (partner: MatchedPartner) => Promise<void>;
  endCall: () => void;
  toggleMute: () => boolean;
  isSupported: boolean;
};

export function useWebRTC(callbacks: WebRTCCallbacks): WebRTCHandle {
  const socket = useSocket();
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const partnerSocketIdRef = useRef<string | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const isSupported =
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    typeof window.RTCPeerConnection !== "undefined" &&
    typeof navigator?.mediaDevices?.getUserMedia === "function";

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    partnerSocketIdRef.current = null;
    // Clean up remote audio element
    if (Platform.OS === "web" && typeof document !== "undefined" && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.remove();
      remoteAudioRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Listen for incoming WebRTC signaling
  useEffect(() => {
    const offOffer = socket.onOffer(async ({ from, sdp }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.sendAnswer(from, answer);
    });

    const offAnswer = socket.onAnswer(async ({ sdp }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    const offIce = socket.onIceCandidate(async ({ candidate }) => {
      if (!pcRef.current) return;
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // ignore stale candidates
      }
    });

    const offEnded = socket.onCallEnded(() => {
      cleanup();
      callbacks.onCallEnded?.();
    });

    return () => {
      offOffer();
      offAnswer();
      offIce();
      offEnded();
    };
  }, [socket, cleanup, callbacks]);

  const playRemoteStream = useCallback((stream: MediaStream) => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    if (!remoteAudioRef.current) {
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;";
      document.body.appendChild(audio);
      remoteAudioRef.current = audio;
    }
    remoteAudioRef.current.srcObject = stream;
    remoteAudioRef.current.play().catch(() => {
      // Autoplay blocked — will resume on next user interaction
    });
  }, []);

  const startCall = useCallback(async (partner: MatchedPartner) => {
    if (!isSupported) return;
    cleanup();

    partnerSocketIdRef.current = partner.partnerSocketId;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch {
      stream = new MediaStream();
    }
    localStreamRef.current = stream;

    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    pcRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (remoteStream) {
        playRemoteStream(remoteStream);
        callbacks.onRemoteStream?.(remoteStream);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && partnerSocketIdRef.current) {
        socket.sendIceCandidate(partnerSocketIdRef.current, event.candidate.toJSON());
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        cleanup();
        callbacks.onCallEnded?.();
      }
    };

    if (partner.isInitiator) {
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      socket.sendOffer(partner.partnerSocketId, offer);
    }
  }, [isSupported, cleanup, socket, callbacks, playRemoteStream]);

  const endCall = useCallback(() => {
    if (partnerSocketIdRef.current) {
      socket.sendCallEnded(partnerSocketIdRef.current);
    }
    cleanup();
  }, [socket, cleanup]);

  const toggleMute = useCallback((): boolean => {
    const stream = localStreamRef.current;
    if (!stream) return false;
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return false;
    audioTrack.enabled = !audioTrack.enabled;
    return !audioTrack.enabled;
  }, []);

  return { startCall, endCall, toggleMute, isSupported };
}
