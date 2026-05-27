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

type SocketContextValue = {
  connected: boolean;
  queueSize: number;
  presenceMap: Record<string, PresenceStatus>;
  joinQueue: () => void;
  leaveQueue: () => void;
  sendOffer: (toSocketId: string, sdp: RTCSessionDescriptionInit) => void;
  sendAnswer: (toSocketId: string, sdp: RTCSessionDescriptionInit) => void;
  sendIceCandidate: (toSocketId: string, candidate: RTCIceCandidateInit) => void;
  sendCallEnded: (toSocketId: string) => void;
  onMatched: (handler: (partner: MatchedPartner) => void) => () => void;
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

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("presence_snapshot", (snapshot: Record<string, PresenceStatus>) => {
      setPresenceMap(snapshot);
    });

    socket.on("presence_update", ({ userId, status }: { userId: string; status: PresenceStatus }) => {
      setPresenceMap((prev) => ({ ...prev, [userId]: status }));
    });

    socket.on("queue_size", (size: number) => {
      setQueueSize(size);
    });

    // Heartbeat every 30s
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

  const joinQueue = useCallback(() => {
    socketRef.current?.emit("join_queue");
  }, []);

  const leaveQueue = useCallback(() => {
    socketRef.current?.emit("leave_queue");
  }, []);

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

  const onMatched = useCallback((handler: (p: MatchedPartner) => void) => {
    const sock = socketRef.current;
    if (!sock) return () => {};
    sock.on("matched", handler);
    return () => sock.off("matched", handler);
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
      connected,
      queueSize,
      presenceMap,
      joinQueue,
      leaveQueue,
      sendOffer,
      sendAnswer,
      sendIceCandidate,
      sendCallEnded,
      onMatched,
      onOffer,
      onAnswer,
      onIceCandidate,
      onCallEnded,
    }),
    [
      connected, queueSize, presenceMap,
      joinQueue, leaveQueue, sendOffer, sendAnswer, sendIceCandidate, sendCallEnded,
      onMatched, onOffer, onAnswer, onIceCandidate, onCallEnded,
    ],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
}
