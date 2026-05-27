import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable as RNPressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import { Card } from "@/components/Card";
import { useApp } from "@/context/AppContext";
import { useSocket, type MatchedPartner } from "@/context/SocketContext";
import { AI_FEEDBACK, AI_SUGGESTIONS } from "@/data/aiTips";
import { useColors } from "@/hooks/useColors";
import { useWebRTC } from "@/hooks/useWebRTC";
import { showAlert } from "@/utils/alert";

type Stage = "matching" | "in-call" | "ended";

const MATCH_TIMEOUT_MS = 30_000;

export default function PracticeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { freeMinutesRemaining, consumeFreeMinutes, recordCall } = useApp();
  const socket = useSocket();

  const [stage, setStage] = useState<Stage>("matching");
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [partner, setPartner] = useState<MatchedPartner | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  const matchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;

  // ── Pulse animation ────────────────────────────────────────────────────────
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // ── WebRTC ─────────────────────────────────────────────────────────────────
  const webrtc = useWebRTC({
    onCallEnded: useCallback(() => {
      if (stage === "in-call") {
        void endCall();
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage]),
  });

  // ── Join queue on mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket.connected) return;
    socket.joinQueue();

    matchTimeoutRef.current = setTimeout(() => {
      if (stage === "matching") {
        socket.leaveQueue();
        setMatchError("No partner found nearby. Try again in a moment.");
      }
    }, MATCH_TIMEOUT_MS);

    return () => {
      socket.leaveQueue();
      if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket.connected]);

  // ── Handle match ───────────────────────────────────────────────────────────
  useEffect(() => {
    const off = socket.onMatched(async (matched) => {
      if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);
      setPartner(matched);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setStage("in-call");

      // Start WebRTC (web only; native needs custom build)
      if (webrtc.isSupported) {
        try {
          await webrtc.startCall(matched);
        } catch {
          // graceful degradation — call UI still shows
        }
      }
    });
    return off;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, webrtc]);

  // ── Call timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== "in-call") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [stage]);

  // Auto-end when free minutes exhausted
  useEffect(() => {
    if (stage !== "in-call") return;
    if (freeMinutesRemaining <= 0) void endCall();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeMinutesRemaining, stage]);

  // Charge free minutes per full minute
  useEffect(() => {
    if (stage !== "in-call" || seconds === 0 || seconds % 60 !== 0) return;
    void consumeFreeMinutes(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, stage]);

  // Rotate AI tips every 8s
  useEffect(() => {
    if (stage !== "in-call") return;
    const id = setInterval(() => setTipIndex((i) => (i + 1) % AI_SUGGESTIONS.length), 8000);
    return () => clearInterval(id);
  }, [stage]);

  const endCall = async () => {
    if (stage === "ended") return;
    webrtc.endCall();
    const minutes = Math.max(1, Math.round(seconds / 60));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    const good = AI_FEEDBACK.good[Math.floor(Math.random() * AI_FEEDBACK.good.length)];
    const improve = AI_FEEDBACK.improve[Math.floor(Math.random() * AI_FEEDBACK.improve.length)];
    await recordCall({
      minutes,
      type: "practice",
      partnerName: partner?.partnerName ?? "Partner",
      partnerInitials: (partner?.partnerName ?? "P").substring(0, 2).toUpperCase(),
      partnerColor: partner?.partnerColor ?? "#5B3DFF",
      partnerRegion: partner?.partnerRegion,
      feedback: { good, improve },
    });
    setStage("ended");
  };

  const handleHangup = () => {
    if (stage === "matching") {
      socket.leaveQueue();
      router.back();
      return;
    }
    showAlert("End call?", "We'll save your progress and show feedback.", [
      { text: "Keep talking", style: "cancel" },
      { text: "End", style: "destructive", onPress: () => void endCall() },
    ]);
  };

  const handleMuteToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    if (webrtc.isSupported) {
      const nowMuted = webrtc.toggleMute();
      setMuted(nowMuted);
    } else {
      setMuted((m) => !m);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  const partnerColor = partner?.partnerColor ?? "#5B3DFF";
  const partnerName = partner?.partnerName ?? "Finding partner…";
  const partnerRegion = partner?.partnerRegion ?? "";
  const partnerLevel = partner?.partnerLevel ?? "";
  const partnerInitials = (partner?.partnerName ?? "?").substring(0, 2).toUpperCase();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: "#1A1530" }}>
        <LinearGradient
          colors={["#1A1530", "#3A2A66", "#5B3DFF"]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {stage === "ended" ? (
          <EndedView
            seconds={seconds}
            partnerName={partnerName}
            onDone={() => router.back()}
            onAgain={() => {
              setStage("matching");
              setSeconds(0);
              setTipIndex(0);
              setPartner(null);
              setMatchError(null);
              socket.joinQueue();
              matchTimeoutRef.current = setTimeout(() => {
                socket.leaveQueue();
                setMatchError("No partner found. Try again.");
              }, MATCH_TIMEOUT_MS);
            }}
          />
        ) : (
          <View
            style={{
              flex: 1,
              paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
              paddingBottom: insets.bottom + 24,
              paddingHorizontal: 20,
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <RNPressable
                onPress={handleHangup}
                hitSlop={12}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }}
              >
                <Feather name="chevron-down" size={20} color="#FFFFFF" />
              </RNPressable>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "#FFFFFF", opacity: 0.7, fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 2 }}>
                  {stage === "matching" ? "MATCHING" : "LIVE PRACTICE"}
                </Text>
                <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 16, marginTop: 2 }}>
                  {stage === "matching" ? "Finding a partner…" : formatTime(seconds)}
                </Text>
              </View>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#16A085", alignItems: "center", justifyContent: "center" }}>
                <Feather name="phone-call" size={16} color="#FFFFFF" />
              </View>
            </View>

            {/* Queue size indicator */}
            {stage === "matching" ? (
              <View style={{ alignItems: "center", marginTop: 16 }}>
                {matchError ? (
                  <Text style={{ color: "#FF7A45", fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "center" }}>
                    {matchError}
                  </Text>
                ) : (
                  <Text style={{ color: "#FFFFFF", opacity: 0.6, fontFamily: "Inter_500Medium", fontSize: 12 }}>
                    {socket.queueSize > 1
                      ? `${socket.queueSize} people in queue — connecting…`
                      : socket.connected
                        ? "Waiting for a practice partner…"
                        : "Connecting to server…"}
                  </Text>
                )}
              </View>
            ) : null}

            {/* Partner avatar */}
            <View style={{ alignItems: "center", marginTop: stage === "matching" ? 40 : 60 }}>
              <View style={{ width: 160, height: 160, alignItems: "center", justifyContent: "center" }}>
                <Animated.View
                  style={{ position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: partnerColor, opacity: pulseOpacity, transform: [{ scale: pulseScale }] }}
                />
                <Avatar initials={partnerInitials} size={120} color={partnerColor} />
              </View>
              <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 22, marginTop: 18 }}>
                {partnerName}
              </Text>
              {partnerRegion ? (
                <Text style={{ color: "#FFFFFF", opacity: 0.75, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4 }}>
                  {partnerRegion}{partnerLevel ? ` · ${partnerLevel}` : ""}
                </Text>
              ) : null}
            </View>

            {/* AI Coach tips */}
            {stage === "in-call" ? (
              <ScrollView style={{ flex: 1, marginTop: 32 }} contentContainerStyle={{ gap: 12 }} showsVerticalScrollIndicator={false}>
                {!webrtc.isSupported ? (
                  <View style={{ backgroundColor: "rgba(255,122,69,0.18)", borderRadius: 18, padding: 16 }}>
                    <Text style={{ color: "#FF7A45", fontFamily: "Inter_700Bold", fontSize: 13, letterSpacing: 0.5 }}>
                      VOICE CALLING
                    </Text>
                    <Text style={{ color: "#FFFFFF", opacity: 0.85, fontFamily: "Inter_500Medium", fontSize: 14, marginTop: 6, lineHeight: 20 }}>
                      Voice calls work on this web preview and on native device builds. You are matched with {partnerName} — start talking!
                    </Text>
                  </View>
                ) : null}
                <View style={{ backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 18, padding: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
                      <Feather name="cpu" size={14} color="#FFFFFF" />
                    </View>
                    <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 1 }}>AI COACH</Text>
                  </View>
                  <Text style={{ color: "#1A1530", fontFamily: "Inter_500Medium", fontSize: 15, marginTop: 10, lineHeight: 20 }}>
                    {AI_SUGGESTIONS[tipIndex]}
                  </Text>
                </View>
              </ScrollView>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            {/* Controls */}
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 22, paddingTop: 12 }}>
              <RoundButton icon={muted ? "mic-off" : "mic"} onPress={handleMuteToggle} bg="rgba(255,255,255,0.15)" />
              <RoundButton icon="phone-off" onPress={handleHangup} bg="#E5484D" size={72} />
              <RoundButton
                icon="message-circle"
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined); setTipIndex((i) => (i + 1) % AI_SUGGESTIONS.length); }}
                bg="rgba(255,255,255,0.15)"
              />
            </View>
          </View>
        )}
      </View>
    </>
  );
}

function RoundButton({ icon, onPress, bg, size = 60 }: {
  icon: React.ComponentProps<typeof Feather>["name"];
  onPress: () => void;
  bg: string;
  size?: number;
}) {
  return (
    <RNPressable
      onPress={onPress}
      style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] })}
    >
      <Feather name={icon} size={size === 72 ? 28 : 22} color="#FFFFFF" />
    </RNPressable>
  );
}

function EndedView({ seconds, partnerName, onDone, onAgain }: {
  seconds: number; partnerName: string; onDone: () => void; onAgain: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const minutes = Math.max(1, Math.round(seconds / 60));
  const goodTip = AI_FEEDBACK.good[Math.floor(Math.random() * AI_FEEDBACK.good.length)];
  const improveTip = AI_FEEDBACK.improve[Math.floor(Math.random() * AI_FEEDBACK.improve.length)];

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + (Platform.OS === "web" ? 67 : 24), paddingBottom: insets.bottom + 24, paddingHorizontal: 20 }}>
      <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 28, textAlign: "center", marginTop: 12 }}>Great session!</Text>
      <Text style={{ color: "#FFFFFF", opacity: 0.85, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", marginTop: 8 }}>
        You spoke for {minutes} minute{minutes === 1 ? "" : "s"} with {partnerName}.
      </Text>
      <View style={{ marginTop: 32, gap: 12 }}>
        <Card>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#DDF5EE", alignItems: "center", justifyContent: "center" }}>
              <Feather name="thumbs-up" size={18} color="#0E6F5A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: colors.foreground }}>What went well</Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground, marginTop: 4, lineHeight: 18 }}>{goodTip}</Text>
            </View>
          </View>
        </Card>
        <Card>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFE9DD", alignItems: "center", justifyContent: "center" }}>
              <Feather name="trending-up" size={18} color="#A93D00" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: colors.foreground }}>One thing to try</Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground, marginTop: 4, lineHeight: 18 }}>{improveTip}</Text>
            </View>
          </View>
        </Card>
      </View>
      <View style={{ marginTop: 32, gap: 10 }}>
        <Button label="Practice again" icon="refresh-ccw" onPress={onAgain} fullWidth size="lg" />
        <Button label="Back to home" variant="outline" onPress={onDone} fullWidth />
      </View>
    </ScrollView>
  );
}
