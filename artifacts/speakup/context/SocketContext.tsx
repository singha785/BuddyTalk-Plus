import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io, type Socket } from "socket.io-client";
import { Platform } from "react-native";

import { useAuth } from "@/context/AuthContext";

export type PresenceStatus = "live" | "in-call" | "away" | "offline";

export type MatchedPartner = {
  partnerId: string;
  partnerSocketId: string;
  partnerName: string;
  partnerRegion: string;
  partnerLevel: string;
  partnerColor: string;
  isInitiator: boolean;
};

export type IncomingCallData = {
  callId: string;
  callerId: string;
  callerSocketId: string;
  callerName: string;
  callerRegion: string;
  callerLevel: string;
  callerColor: string;
};

type SocketContextValue = {
  connected: boolean;
  queueSize: number;
  presenceMap: Record<string, PresenceStatus>;
  userOnline: boolean;
  // Legacy queue
  joinQueue: () => void;
  leaveQueue: () => void;
  // Push-based calling
  callUser: () => void;
  cancelCall: () => void;
  acceptIncomingCall: (callId: string) => void;
  rejectIncomingCall: (callId: string) => void;
  setUserOnlineStatus: (online: boolean) => void;
  // WebRTC signaling
  sendOffer: (toSocketId: string, sdp: RTCSessionDescriptionInit) => void;
  sendAnswer: (toSocketId: string, sdp: RTCSessionDescriptionInit) => void;
  sendIceCandidate: (toSocketId: string, candidate: RTCIceCandidateInit) => void;
  sendCallEnded: (toSocketId: string) => void;
  // Event listeners — legacy
  onMatched: (handler: (partner: MatchedPartner) => void) => () => void;
  // Event listeners — push-based
  onCallRinging: (handler: (data: { callId: string }) => void) => () => void;
  onCallMatched: (handler: (partner: MatchedPartner) => void) => () => void;
  onIncomingCall: (handler: (data: IncomingCallData) => void) => () => void;
  onNoUsersAvailable: (handler: () => void) => () => void;
  onCallCancelled: (handler: () => void) => () => void;
  // WebRTC event listeners
  onOffer: (handler: (data: { from: string; sdp: RTCSessionDescriptionInit }) => void) => () => void;
  onAnswer: (handler: (data: { from: string; sdp: RTCSessionDescriptionInit }) => void) => () => void;
  onIceCandidate: (handler: (data: { from: string; candidate: RTCIceCandidateInit }) => void) => () => void;
  onCallEnded: (handler: (data: { from: string }) => void) => () => void;
};

const SocketContext = createContext<SocketContextValue | null>(null);

function getSocketUrl(): string {
  if (Platform.OS !== "web") {
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    if (domain) return `https://${domain}`;
    if (__DEV__) console.warn("[SocketContext] EXPO_PUBLIC_DOMAIN not set, falling back to localhost");
    return "http://localhost:80";
  }
  return typeof window !== "undefined" ? window.location.origin : "";
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceStatus>>({});
  const [userOnline, setUserOnline] = useState(true);

  useEffect(() => {
    if (!token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      setPresenceMap({});
      return;
    }

    const url = getSocketUrl();
    const socket = io(url, {
      path: "/api/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => { setConnected(true); });
    socket.on("disconnect", () => { setConnected(false); });
    socket.on("presence_snapshot", (snapshot: Record<string, PresenceStatus>) => { setPresenceMap(snapshot); });
    socket.on("presence_update", ({ userId, status }: { userId: string; status: PresenceStatus }) => {
      setPresenceMap((prev) => ({ ...prev, [userId]: status }));
    });
    socket.on("queue_size", (size: number) => { setQueueSize(size); });

    const heartbeat = setInterval(() => {
      if (socket.connected) socket.emit("heartbeat", { status: "live" });
    }, 30_000);

    return () => {
      clearInterval(heartbeat);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token]);

  // ── Legacy queue ──────────────────────────────────────────────────────────
  const joinQueue = useCallback(() => { socketRef.current?.emit("join_queue"); }, []);
  const leaveQueue = useCallback(() => { socketRef.current?.emit("leave_queue"); }, []);

  // ── Push-based calling ────────────────────────────────────────────────────
  const callUser = useCallback(() => { socketRef.current?.emit("call_user"); }, []);
  const cancelCall = useCallback(() => { socketRef.current?.emit("cancel_call", {}); }, []);
  const acceptIncomingCall = useCallback((callId: string) => {
    socketRef.current?.emit("call_accept", { callId });
  }, []);
  const rejectIncomingCall = useCallback((callId: string) => {
    socketRef.current?.emit("call_reject", { callId });
  }, []);
  const setUserOnlineStatus = useCallback((online: boolean) => {
    setUserOnline(online);
    socketRef.current?.emit("set_online_status", { online });
  }, []);

  // ── WebRTC signaling ──────────────────────────────────────────────────────
  const sendOffer = useCallback((toSocketId: string, sdp: RTCSessionDescriptionInit) => {
    socketRef.current?.emit("offer", { to: toSocketId, sdp });
  }, []);
  const sendAnswer = useCallback((toSocketId: string, sdp: RTCSessionDescriptionInit) => {
    socketRef.current?.emit("answer", { to: toSocketId, sdp });
  }, []);
  const sendIceCandidate = useCallback((toSocketId: string, candidate: RTCIceCandidateInit) => {
    socketRef.current?.emit("ice_candidate", { to: toSocketId, candidate });
  }, []);
  const sendCallEnded = useCallback((toSocketId: string) => {
    socketRef.current?.emit("call_ended", { to: toSocketId });
  }, []);

  // ── Event listeners ───────────────────────────────────────────────────────
  const onMatched = useCallback((handler: (p: MatchedPartner) => void) => {
    const sock = socketRef.current;
    if (!sock) return () => {};
    sock.on("matched", handler);
    return () => sock.off("matched", handler);
  }, []);

  const onCallRinging = useCallback((handler: (d: { callId: string }) => void) => {
    const sock = socketRef.current;
    if (!sock) return () => {};
    sock.on("call_ringing", handler);
    return () => sock.off("call_ringing", handler);
  }, []);

  const onCallMatched = useCallback((handler: (p: MatchedPartner) => void) => {
    const sock = socketRef.current;
    if (!sock) return () => {};
    sock.on("call_matched", handler);
    return () => sock.off("call_matched", handler);
  }, []);

  const onIncomingCall = useCallback((handler: (d: IncomingCallData) => void) => {
    const sock = socketRef.current;
    if (!sock) return () => {};
    sock.on("incoming_call", handler);
    return () => sock.off("incoming_call", handler);
  }, []);

  const onNoUsersAvailable = useCallback((handler: () => void) => {
    const sock = socketRef.current;
    if (!sock) return () => {};
    sock.on("no_users_available", handler);
    return () => sock.off("no_users_available", handler);
  }, []);

  const onCallCancelled = useCallback((handler: () => void) => {
    const sock = socketRef.current;
    if (!sock) return () => {};
    sock.on("call_cancelled", handler);
    return () => sock.off("call_cancelled", handler);
  }, []);

  const onOffer = useCallback((handler: (d: { from: string; sdp: RTCSessionDescriptionInit }) => void) => {
    const sock = socketRef.current;
    if (!sock) return () => {};
    sock.on("offer", handler);
    return () => sock.off("offer", handler);
  }, []);

  const onAnswer = useCallback((handler: (d: { from: string; sdp: RTCSessionDescriptionInit }) => void) => {
    const sock = socketRef.current;
    if (!sock) return () => {};
    sock.on("answer", handler);
    return () => sock.off("answer", handler);
  }, []);

  const onIceCandidate = useCallback((handler: (d: { from: string; candidate: RTCIceCandidateInit }) => void) => {
    const sock = socketRef.current;
    if (!sock) return () => {};
    sock.on("ice_candidate", handler);
    return () => sock.off("ice_candidate", handler);
  }, []);

  const onCallEnded = useCallback((handler: (d: { from: string }) => void) => {
    const sock = socketRef.current;
    if (!sock) return () => {};
    sock.on("call_ended", handler);
    return () => sock.off("call_ended", handler);
  }, []);

  const value = useMemo<SocketContextValue>(
    () => ({
      connected, queueSize, presenceMap, userOnline,
      joinQueue, leaveQueue,
      callUser, cancelCall, acceptIncomingCall, rejectIncomingCall, setUserOnlineStatus,
      sendOffer, sendAnswer, sendIceCandidate, sendCallEnded,
      onMatched, onCallRinging, onCallMatched, onIncomingCall, onNoUsersAvailable, onCallCancelled,
      onOffer, onAnswer, onIceCandidate, onCallEnded,
    }),
    [
      connected, queueSize, presenceMap, userOnline,
      joinQueue, leaveQueue,
      callUser, cancelCall, acceptIncomingCall, rejectIncomingCall, setUserOnlineStatus,
      sendOffer, sendAnswer, sendIceCandidate, sendCallEnded,
      onMatched, onCallRinging, onCallMatched, onIncomingCall, onNoUsersAvailable, onCallCancelled,
      onOffer, onAnswer, onIceCandidate, onCallEnded,
    ],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
}
