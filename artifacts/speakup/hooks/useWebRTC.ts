import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useSocket, type MatchedPartner } from "@/context/SocketContext";

const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
];

type PendingSignal =
  | { type: "offer"; from: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; from: string; candidate: RTCIceCandidateInit };

type WebRTCCallbacks = {
  onRemoteStream?: (stream: MediaStream) => void;
  onCallEnded?: () => void;
  onError?: (msg: string) => void;
};

export type WebRTCHandle = {
  startCall: (partner: MatchedPartner) => Promise<void>;
  endCall: () => void;
  toggleMute: () => boolean;
  isSupported: boolean;
  micError: string | null;
};

export function useWebRTC(callbacks: WebRTCCallbacks): WebRTCHandle {
  const socket = useSocket();
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const partnerSocketIdRef = useRef<string | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  // Buffer signals that arrive before the RTCPeerConnection is ready
  const pendingSignalsRef = useRef<PendingSignal[]>([]);
  const [micError, setMicError] = useState<string | null>(null);

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
    pendingSignalsRef.current = [];
    if (Platform.OS === "web" && typeof document !== "undefined" && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.remove();
      remoteAudioRef.current = null;
    }
  }, []);

  useEffect(() => { return cleanup; }, [cleanup]);

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
    remoteAudioRef.current.play().catch(() => {});
  }, []);

  // ── Process a received offer: set remote description + send answer ──────────
  const processOffer = useCallback(
    async (pc: RTCPeerConnection, from: string, sdp: RTCSessionDescriptionInit) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.sendAnswer(from, answer);
      } catch {
        // Stale or duplicate offer — ignore
      }
    },
    [socket],
  );

  // ── Drain any signals that arrived before the PC was initialized ────────────
  const drainPendingSignals = useCallback(
    async (pc: RTCPeerConnection) => {
      const signals = pendingSignalsRef.current.splice(0);
      for (const sig of signals) {
        if (sig.type === "offer") {
          await processOffer(pc, sig.from, sig.sdp);
        } else {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(sig.candidate));
          } catch { /* stale */ }
        }
      }
    },
    [processOffer],
  );

  // ── Socket signal listeners — registered once on mount ──────────────────────
  useEffect(() => {
    const offOffer = socket.onOffer(async ({ from, sdp }) => {
      const pc = pcRef.current;
      if (!pc) {
        // PC not ready yet — buffer the offer and drain once startCall completes
        pendingSignalsRef.current.push({ type: "offer", from, sdp });
        return;
      }
      await processOffer(pc, from, sdp);
    });

    const offAnswer = socket.onAnswer(async ({ sdp }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch { /* stale */ }
    });

    const offIce = socket.onIceCandidate(async ({ candidate }) => {
      const pc = pcRef.current;
      if (!pc) {
        // Buffer ICE candidates so they're applied after PC is ready
        pendingSignalsRef.current.push({ type: "ice", from: "", candidate });
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch { /* stale */ }
    });

    const offEnded = socket.onCallEnded(() => {
      cleanup();
      callbacks.onCallEnded?.();
    });

    return () => { offOffer(); offAnswer(); offIce(); offEnded(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const startCall = useCallback(
    async (partner: MatchedPartner) => {
      if (!isSupported) return;
      cleanup();
      setMicError(null);
      partnerSocketIdRef.current = partner.partnerSocketId;

      // ── Acquire microphone — never silently fall back ─────────────────────
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch (err) {
        const isPermissionDenied =
          err instanceof Error &&
          (err.name === "NotAllowedError" ||
            err.name === "PermissionDeniedError" ||
            err.message.toLowerCase().includes("denied"));
        const msg = isPermissionDenied
          ? "Microphone access was denied. Tap the browser's address bar and allow microphone access, then try again."
          : "Could not start your microphone. Check that it is not used by another app and try again.";
        setMicError(msg);
        callbacks.onError?.(msg);
        // Still proceed so the matched user sees us as "in call" — just no audio from our side
        stream = new MediaStream();
      }

      localStreamRef.current = stream;

      // ── Create peer connection ─────────────────────────────────────────────
      const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
      pcRef.current = pc;

      // Add all audio tracks (may be empty if mic was denied)
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
        const state = pc.connectionState;
        if (state === "disconnected" || state === "failed" || state === "closed") {
          cleanup();
          callbacks.onCallEnded?.();
        }
      };

      // ── Drain signals buffered before PC was ready ────────────────────────
      // (Happens when offer arrives during our getUserMedia call)
      await drainPendingSignals(pc);

      // ── Initiator creates and sends the offer ─────────────────────────────
      if (partner.isInitiator) {
        try {
          const offer = await pc.createOffer({ offerToReceiveAudio: true });
          await pc.setLocalDescription(offer);
          socket.sendOffer(partner.partnerSocketId, offer);
        } catch {
          // SDP creation error — connection may still work via incoming offer
        }
      }
    },
    [isSupported, cleanup, socket, callbacks, playRemoteStream, drainPendingSignals],
  );

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

  return { startCall, endCall, toggleMute, isSupported, micError };
}
