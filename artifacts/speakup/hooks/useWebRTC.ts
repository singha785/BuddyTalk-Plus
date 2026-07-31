import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useSocket, type MatchedPartner } from "@/context/SocketContext";
import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices } from "@/lib/webrtc";

// InCallManager is native-only — dynamic import avoids web crashes
let InCallManager: {
  start: (opts: { media: string }) => void;
  stop: () => void;
  setForceSpeakerphoneOn: (on: boolean) => void;
} | null = null;

if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  InCallManager = require("react-native-incall-manager").default;
}

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
  // Buffer signals that arrive before the RTCPeerConnection is ready OR
  // before remoteDescription has been set (ICE candidates need both)
  const pendingSignalsRef = useRef<PendingSignal[]>([]);
  const [micError, setMicError] = useState<string | null>(null);

  // --- FIX Bug 2: always call the latest callbacks, even if the socket
  //     listener effect only runs once (with [socket] as dependency).
  const callbacksRef = useRef(callbacks);
  useEffect(() => { callbacksRef.current = callbacks; }, [callbacks]);

  // WebRTC is supported on web when browser globals exist, and always on
  // native now that react-native-webrtc is installed.
  const isSupported =
    Platform.OS !== "web"
      ? true
      : typeof window !== "undefined" &&
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
    // Stop in-call audio routing on native
    if (Platform.OS !== "web") {
      InCallManager?.stop();
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

  // ── Process a received offer: set remote description, flush pending ICE,
  //    then create + send answer. ───────────────────────────────────────────
  const processOffer = useCallback(
    async (pc: RTCPeerConnection, from: string, sdp: RTCSessionDescriptionInit) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        // --- FIX Bug 1: flush ICE candidates that arrived while
        //     remoteDescription was not yet set. Only flush ICE type signals;
        //     leave any buffered offers in the queue.
        const iceToApply = pendingSignalsRef.current.filter((s) => s.type === "ice");
        pendingSignalsRef.current = pendingSignalsRef.current.filter((s) => s.type !== "ice");
        for (const sig of iceToApply) {
          if (sig.type === "ice") {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(sig.candidate));
            } catch { /* stale */ }
          }
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.sendAnswer(from, answer);
      } catch {
        // Stale or duplicate offer — ignore
      }
    },
    [socket],
  );

  // ── Drain any signals that arrived before the PC was initialized ────────
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

  // ── Socket signal listeners — registered once on mount ──────────────────
  useEffect(() => {
    const offOffer = socket.onOffer(async ({ from, sdp }) => {
      const pc = pcRef.current;
      if (!pc) {
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
        // Flush ICE candidates that were queued before the answer was applied
        const iceToApply = pendingSignalsRef.current.filter((s) => s.type === "ice");
        pendingSignalsRef.current = pendingSignalsRef.current.filter((s) => s.type !== "ice");
        for (const sig of iceToApply) {
          if (sig.type === "ice") {
            try { await pc.addIceCandidate(new RTCIceCandidate(sig.candidate)); } catch { /* stale */ }
          }
        }
      } catch { /* stale */ }
    });

    // --- FIX Bug 1: also queue ICE candidates when remoteDescription is not
    //     yet set (not just when pc doesn't exist yet).
    const offIce = socket.onIceCandidate(async ({ candidate }) => {
      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription) {
        pendingSignalsRef.current.push({ type: "ice", from: "", candidate });
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch { /* stale */ }
    });

    // --- FIX Bug 2: use callbacksRef so this handler always calls the
    //     latest onCallEnded, even though this effect only runs once.
    const offEnded = socket.onCallEnded(() => {
      cleanup();
      callbacksRef.current.onCallEnded?.();
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

      // ── Acquire microphone ─────────────────────────────────────────────
      let stream: MediaStream;
      try {
        stream = await mediaDevices.getUserMedia({ audio: true, video: false });
      } catch (err) {
        const isPermissionDenied =
          err instanceof Error &&
          (err.name === "NotAllowedError" ||
            err.name === "PermissionDeniedError" ||
            err.message.toLowerCase().includes("denied"));
        const msg = isPermissionDenied
          ? "Microphone access was denied. Please allow microphone permission and try again."
          : "Could not start your microphone. Check that it is not used by another app and try again.";
        setMicError(msg);
        callbacksRef.current.onError?.(msg);
        stream = new MediaStream();
      }

      localStreamRef.current = stream;

      // ── Start in-call audio routing on native (must happen before PC) ──
      if (Platform.OS !== "web") {
        InCallManager?.start({ media: "audio" });
        InCallManager?.setForceSpeakerphoneOn(true);
      }

      // ── Create peer connection ─────────────────────────────────────────
      const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        if (remoteStream) {
          playRemoteStream(remoteStream);
          callbacksRef.current.onRemoteStream?.(remoteStream);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && partnerSocketIdRef.current) {
          socket.sendIceCandidate(partnerSocketIdRef.current, event.candidate.toJSON());
        }
      };

      // --- FIX Bug 2: use callbacksRef so stale closure never suppresses
      //     the call-ended notification on the non-hanging-up side.
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === "disconnected" || state === "failed" || state === "closed") {
          cleanup();
          callbacksRef.current.onCallEnded?.();
        }
      };

      // ── Drain signals buffered before PC was ready ────────────────────
      await drainPendingSignals(pc);

      // ── Initiator creates and sends the offer ─────────────────────────
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
    [isSupported, cleanup, socket, playRemoteStream, drainPendingSignals],
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
