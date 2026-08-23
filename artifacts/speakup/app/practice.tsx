import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack, useLocalSearchParams } from "expo-router";
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
import { AI_SUGGESTIONS, generateContextualFeedback } from "@/data/aiTips";
import { useColors } from "@/hooks/useColors";
import { useWebRTC } from "@/hooks/useWebRTC";
import { showAlert } from "@/utils/alert";

// Greeting suggestions shown in the first 28 seconds of a call
const GREETING_HINTS = [
  "Try saying: Hi! Where are you calling from today?",
  "Try saying: Hello! What's your name?",
  "Try saying: Good to meet you! How's your day going?",
  "Try saying: Hey there! Do you practice English often?",
  "Try saying: Nice to connect! Tell me a bit about yourself.",
  "Try saying: Hello! I'm really glad to practice with you.",
  "Try saying: Hi! Is this your first time using BuddyTalk?",
  "Try saying: Good day! What topics do you enjoy discussing?",
];

const REAL_TALK_GOAL_SECS = 300;   // 5 minutes
const SPEAKING_RATIO_FULL = 0.20;  // must speak ≥20 % of call time for full coins

// searching → server is finding a user
// ringing   → receiver's phone is ringing, waiting for accept/reject
// in-call   → call accepted, live session
// ended     → call over, show feedback
type Stage = "searching" | "ringing" | "in-call" | "ended";

const CALL_TIMEOUT_MS = 40_000;

export default function PracticeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { freeMinutesRemaining, consumeFreeMinutes, recordCall, completeTask, trackGreeting, state } = useApp();
  const socket = useSocket();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isIncomingMode = mode === "incoming";

  // Incoming mode starts at ringing (already accepted, waiting for call_matched)
  const [stage, setStage] = useState<Stage>(isIncomingMode ? "ringing" : "searching");
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [partner, setPartner] = useState<MatchedPartner | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [callNote, setCallNote] = useState<string | null>(null);

  // Greeting hint (first 28 s of call)
  const [greetingHint, setGreetingHint] = useState(GREETING_HINTS[0]);
  const [greetingHintVisible, setGreetingHintVisible] = useState(false);
  const hintOpacity = useRef(new Animated.Value(0)).current;

  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  const ringPulse = useRef(new Animated.Value(0)).current;

  // Keep refs to current stage and mute state so closures never go stale
  const stageRef = useRef<Stage>(stage);
  useEffect(() => { stageRef.current = stage; }, [stage]);

  const mutedRef = useRef(false);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  // Tracks cumulative seconds when mic was NOT muted (proxy for speaking)
  const speakingSecondsRef = useRef(0);
  const speakingRef = useRef(false);

  // ── Pulse animations ────────────────────────────────────────────────────────
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

  useEffect(() => {
    if (stage !== "ringing") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, { toValue: 1, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(ringPulse, { toValue: 0, duration: 600, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [ringPulse, stage]);

  // Keep a ref to endCall so onCallEnded can always invoke the latest version.
  const endCallRef = useRef<(() => Promise<void>) | undefined>(undefined);

  // ── WebRTC ──────────────────────────────────────────────────────────────────
  const webrtc = useWebRTC({
    onCallEnded: useCallback(() => {
      void endCallRef.current?.();
    }, []),
  });

  useEffect(() => { speakingRef.current = webrtc.speaking; }, [webrtc.speaking]);

  const clearCallTimeout = () => {
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
  };

  const startCallTimeout = (msg: string) => {
    clearCallTimeout();
    callTimeoutRef.current = setTimeout(() => {
      setCallError(msg);
      setStage("ended");
    }, CALL_TIMEOUT_MS);
  };

  // ── Caller mode: emit call_user on mount ────────────────────────────────────
  useEffect(() => {
    if (isIncomingMode || !socket.connected) return;
    socket.callUser();
    startCallTimeout("No one available right now. Try again in a moment.");
    return () => {
      socket.cancelCall();
      clearCallTimeout();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket.connected, isIncomingMode]);

  useEffect(() => {
    if (isIncomingMode) {
      startCallTimeout("Call failed to connect. Please try again.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIncomingMode]);

  useEffect(() => {
    const off = socket.onCallRinging(() => setStage("ringing"));
    return off;
  }, [socket]);

  useEffect(() => {
    const off = socket.onCallMatched(async (matched) => {
      clearCallTimeout();
      setPartner(matched);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setStage("in-call");
      if (webrtc.isSupported) {
        try { await webrtc.startCall(matched); } catch { /* graceful degradation */ }
      }
    });
    return off;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, webrtc]);

  useEffect(() => {
    const off = socket.onNoUsersAvailable(() => {
      clearCallTimeout();
      setCallError("No one is online right now. Try again soon!");
      setStage("ended");
    });
    return off;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  useEffect(() => {
    if (!isIncomingMode) return;
    const off = socket.onCallCancelled(() => {
      clearCallTimeout();
      setCallError("The caller disconnected.");
      setStage("ended");
    });
    return off;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, isIncomingMode]);

  // ── Call timer — also tracks speaking seconds (Task 5 VAD) ─────────────────
  useEffect(() => {
    if (stage !== "in-call") return;
    speakingSecondsRef.current = 0; // reset on each call
    const id = setInterval(() => {
      setSeconds((s) => s + 1);
       // Web uses microphone-level detection. Native falls back to the
       // explicit mute state because react-native-webrtc does not expose
       // portable audio metering.
       if (Platform.OS === "web" ? speakingRef.current : !mutedRef.current) {
         speakingSecondsRef.current += 1;
       }
    }, 1000);
    return () => clearInterval(id);
  }, [stage]);

  useEffect(() => {
    if (stage !== "in-call") return;
    if (freeMinutesRemaining <= 0) void endCall();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeMinutesRemaining, stage]);

  useEffect(() => {
    if (stage !== "in-call" || seconds === 0 || seconds % 60 !== 0) return;
    void consumeFreeMinutes(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, stage]);

  useEffect(() => {
    if (stage !== "in-call") return;
    const id = setInterval(() => setTipIndex((i) => (i + 1) % AI_SUGGESTIONS.length), 8000);
    return () => clearInterval(id);
  }, [stage]);

  // ── Greeting hint overlay — shown for first 28 s of call (Task 1 assist) ───
  useEffect(() => {
    if (stage !== "in-call") return;
    const hint = GREETING_HINTS[Math.floor(Math.random() * GREETING_HINTS.length)];
    setGreetingHint(hint);
    setGreetingHintVisible(true);
    hintOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(hintOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(22000),
      Animated.timing(hintOpacity, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start(() => setGreetingHintVisible(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // ── endCall ─────────────────────────────────────────────────────────────────
  const endCall = async () => {
    if (stageRef.current === "ended") return;
    webrtc.endCall();
    const minutes = Math.max(1, Math.round(seconds / 60));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    const { good, improve } = generateContextualFeedback({ seconds, partnerRegion: partner?.partnerRegion });
    await recordCall({
      minutes,
      type: "practice",
      partnerName: partner?.partnerName ?? "Partner",
      partnerInitials: (partner?.partnerName ?? "P").substring(0, 2).toUpperCase(),
      partnerColor: partner?.partnerColor ?? "#5B3DFF",
      partnerRegion: partner?.partnerRegion,
      feedback: { good, improve },
    });
    // Track partner as greeted (auto-completes task-greet-5 when 5 unique partners)
    if (partner?.partnerId) {
      await trackGreeting(partner.partnerId);
    }
    // ── Task 5: award coins based on speaking activity ──────────────────────
    if (seconds >= REAL_TALK_GOAL_SECS && !state.completedTasks.includes("task-real-talk")) {
      const speakingRatio = speakingSecondsRef.current / Math.max(seconds, 1);
      if (speakingRatio >= SPEAKING_RATIO_FULL) {
        await completeTask("task-real-talk", 14);
      } else {
        await completeTask("task-real-talk", 4);
        setCallNote("You were mostly muted this call — try speaking more next time to earn the full +14 coins.");
      }
    }
    setStage("ended");
  };

  endCallRef.current = endCall;

  const handleHangup = () => {
    if (stage === "searching" || stage === "ringing") {
      socket.cancelCall();
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
      setMuted(webrtc.toggleMute());
    } else {
      setMuted((m) => !m);
    }
  };

  const handleCallAgain = () => {
    setStage("searching");
    setSeconds(0);
    setTipIndex(0);
    setPartner(null);
    setCallError(null);
    setCallNote(null);
    socket.callUser();
    startCallTimeout("No one available right now. Try again in a moment.");
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
  const ringScale = ringPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const ringOpacity = ringPulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  const partnerColor = partner?.partnerColor ?? "#5B3DFF";
  const partnerName = partner?.partnerName ?? "…";
  const partnerRegion = partner?.partnerRegion ?? "";
  const partnerLevel = partner?.partnerLevel ?? "";
  const partnerInitials = (partner?.partnerName ?? "?").substring(0, 2).toUpperCase();

  const stageLabel = stage === "searching" ? "FINDING PARTNER" : stage === "ringing" ? "RINGING" : "LIVE PRACTICE";
  const stageSubtitle = stage === "searching"
    ? "Looking for someone online…"
    : stage === "ringing"
      ? isIncomingMode ? "Connecting…" : "Waiting for them to pick up…"
      : formatTime(seconds);

  // 5-min goal progress (Task 5 live indicator)
  const goalPct = Math.min(100, Math.round((seconds / REAL_TALK_GOAL_SECS) * 100));
  const realTalkDone = state.completedTasks.includes("task-real-talk");

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
            partnerRegion={partner?.partnerRegion}
            callError={callError}
            callNote={callNote}
            onDone={() => router.back()}
            onAgain={handleCallAgain}
          />
        ) : (
          <View style={{ flex: 1, paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), paddingBottom: insets.bottom + 24, paddingHorizontal: 20 }}>

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
                  {stageLabel}
                </Text>
                <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 16, marginTop: 2 }}>
                  {stageSubtitle}
                </Text>
              </View>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: stage === "in-call" ? "#16A085" : "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}>
                <Feather name={stage === "in-call" ? "phone-call" : "phone"} size={16} color="#FFFFFF" />
              </View>
            </View>

            {/* ── 5-min call goal progress strip (Task 5) ─────────────────── */}
            {stage === "in-call" && !realTalkDone && (
              <View style={{ marginTop: 10, backgroundColor: "rgba(255,255,255,0.09)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Feather name="target" size={11} color="rgba(255,255,255,0.6)" />
                    <Text style={{ color: "#FFFFFF", opacity: 0.6, fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 0.4 }}>
                      5-MIN CALL GOAL
                    </Text>
                  </View>
                  <Text style={{ color: seconds >= REAL_TALK_GOAL_SECS ? "#34D27D" : "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 11 }}>
                    {formatTime(seconds)} / 5:00{seconds >= REAL_TALK_GOAL_SECS ? " ✓" : ""}
                  </Text>
                </View>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", flexDirection: "row", overflow: "hidden" }}>
                  <View style={{ flex: goalPct, height: 4, backgroundColor: seconds >= REAL_TALK_GOAL_SECS ? "#34D27D" : "#FF7A45" }} />
                  {goalPct < 100 && <View style={{ flex: 100 - goalPct, height: 4 }} />}
                </View>
              </View>
            )}

            {/* Status text under header */}
            {(stage === "searching" || stage === "ringing") && (
              <View style={{ alignItems: "center", marginTop: 16 }}>
                {stage === "searching" ? (
                  <Text style={{ color: "#FFFFFF", opacity: 0.6, fontFamily: "Inter_500Medium", fontSize: 12 }}>
                    {socket.connected ? "Searching for available partners…" : "Connecting to server…"}
                  </Text>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#34D27D" }} />
                    <Text style={{ color: "#FFFFFF", opacity: 0.8, fontFamily: "Inter_500Medium", fontSize: 12 }}>
                      {isIncomingMode ? "Connecting to your caller…" : "Ringing — waiting for them to answer…"}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Partner avatar */}
            <View style={{ alignItems: "center", marginTop: stage === "in-call" ? 32 : 48 }}>
              <View style={{ width: 160, height: 160, alignItems: "center", justifyContent: "center" }}>
                {stage === "ringing" ? (
                  <>
                    <Animated.View style={{ position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "#34D27D", opacity: ringOpacity, transform: [{ scale: ringScale }] }} />
                    <Animated.View style={{ position: "absolute", width: 130, height: 130, borderRadius: 65, backgroundColor: "#34D27D", opacity: ringOpacity, transform: [{ scale: ringScale }] }} />
                  </>
                ) : (
                  <Animated.View style={{ position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: partnerColor, opacity: pulseOpacity, transform: [{ scale: pulseScale }] }} />
                )}
                <Avatar initials={stage === "searching" ? "?" : partnerInitials} size={120} color={stage === "searching" ? "#7C3AED" : stage === "ringing" ? "#34D27D" : partnerColor} />
              </View>
              <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 22, marginTop: 18 }}>
                {stage === "searching" ? "Finding partner…" : stage === "ringing" && !isIncomingMode ? "Ringing…" : partnerName}
              </Text>
              {(partnerRegion && stage === "in-call") ? (
                <Text style={{ color: "#FFFFFF", opacity: 0.75, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4 }}>
                  {partnerRegion}{partnerLevel ? ` · ${partnerLevel}` : ""}
                </Text>
              ) : null}
            </View>

            {/* AI Coach tips + greeting hint — in-call only */}
            {stage === "in-call" ? (
              <ScrollView style={{ flex: 1, marginTop: 20 }} contentContainerStyle={{ gap: 10 }} showsVerticalScrollIndicator={false}>

                {/* ── Greeting hint overlay (Task 1) ──────────────────────── */}
                {greetingHintVisible && (
                  <Animated.View style={{ opacity: hintOpacity, backgroundColor: "rgba(255,122,69,0.18)", borderRadius: 16, padding: 14 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Feather name="message-circle" size={13} color="#FF7A45" />
                      <Text style={{ color: "#FF7A45", fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.5 }}>GREETING IDEA</Text>
                      <RNPressable onPress={() => { hintOpacity.stopAnimation(); setGreetingHintVisible(false); }} hitSlop={8} style={{ marginLeft: "auto" }}>
                        <Feather name="x" size={13} color="rgba(255,122,69,0.6)" />
                      </RNPressable>
                    </View>
                    <Text style={{ color: "#FFFFFF", opacity: 0.9, fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 20 }}>
                      {greetingHint}
                    </Text>
                  </Animated.View>
                )}

                {!webrtc.isSupported ? (
                  <View style={{ backgroundColor: "rgba(255,122,69,0.18)", borderRadius: 18, padding: 16 }}>
                    <Text style={{ color: "#FF7A45", fontFamily: "Inter_700Bold", fontSize: 13, letterSpacing: 0.5 }}>VOICE CALLING</Text>
                    <Text style={{ color: "#FFFFFF", opacity: 0.85, fontFamily: "Inter_500Medium", fontSize: 14, marginTop: 6, lineHeight: 20 }}>
                      Voice calls work on web and native device builds. You are matched with {partnerName} — start talking!
                    </Text>
                  </View>
                ) : null}
                {webrtc.micError ? (
                  <View style={{ backgroundColor: "rgba(229,72,77,0.22)", borderRadius: 18, padding: 16 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <Feather name="mic-off" size={14} color="#E5484D" />
                      <Text style={{ color: "#E5484D", fontFamily: "Inter_700Bold", fontSize: 13, letterSpacing: 0.5 }}>MICROPHONE ISSUE</Text>
                    </View>
                    <Text style={{ color: "#FFFFFF", opacity: 0.85, fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 19 }}>
                      {webrtc.micError}
                    </Text>
                  </View>
                ) : null}
                <View style={{ backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 18, padding: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: "#5B3DFF", alignItems: "center", justifyContent: "center" }}>
                      <Feather name="cpu" size={14} color="#FFFFFF" />
                    </View>
                    <Text style={{ color: "#5B3DFF", fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 1 }}>AI COACH</Text>
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
              {stage === "in-call" ? (
                <>
                  <RoundButton icon={muted ? "mic-off" : "mic"} onPress={handleMuteToggle} bg="rgba(255,255,255,0.15)" />
                  <RoundButton icon="phone-off" onPress={handleHangup} bg="#E5484D" size={72} />
                  <RoundButton
                    icon="message-circle"
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined); setTipIndex((i) => (i + 1) % AI_SUGGESTIONS.length); }}
                    bg="rgba(255,255,255,0.15)"
                  />
                </>
              ) : (
                <RoundButton icon="x" onPress={handleHangup} bg="#E5484D" size={64} />
              )}
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

function EndedView({ seconds, partnerName, partnerRegion, callError, callNote, onDone, onAgain }: {
  seconds: number;
  partnerName: string;
  partnerRegion?: string;
  callError: string | null;
  callNote: string | null;
  onDone: () => void;
  onAgain: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const minutes = Math.max(1, Math.round(seconds / 60));
  const { good: goodTip, improve: improveTip } = React.useMemo(
    () => generateContextualFeedback({ seconds, partnerRegion }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const hadCall = seconds > 5;

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + (Platform.OS === "web" ? 67 : 24), paddingBottom: insets.bottom + 24, paddingHorizontal: 20 }}>
      {callError && !hadCall ? (
        <>
          <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 26, textAlign: "center", marginTop: 12 }}>No one answered</Text>
          <Text style={{ color: "#FFFFFF", opacity: 0.8, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", marginTop: 8 }}>
            {callError}
          </Text>
        </>
      ) : (
        <>
          <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 28, textAlign: "center", marginTop: 12 }}>Great session!</Text>
          <Text style={{ color: "#FFFFFF", opacity: 0.85, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", marginTop: 8 }}>
            You spoke for {minutes} minute{minutes === 1 ? "" : "s"} with {partnerName}.
          </Text>

          {/* Speaking-activity note (Task 5 feedback) */}
          {callNote && (
            <View style={{ backgroundColor: "rgba(255,122,69,0.2)", borderRadius: 16, padding: 14, marginTop: 16, flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
              <Feather name="mic-off" size={16} color="#FF7A45" style={{ marginTop: 1 }} />
              <Text style={{ color: "#FF7A45", fontFamily: "Inter_500Medium", fontSize: 13, flex: 1, lineHeight: 19 }}>
                {callNote}
              </Text>
            </View>
          )}

          <View style={{ marginTop: 24, gap: 12 }}>
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
        </>
      )}
      <View style={{ marginTop: 32, gap: 10 }}>
        <Button label="Call again" icon="phone-call" onPress={onAgain} fullWidth size="lg" />
        <Button label="Back to home" variant="outline" onPress={onDone} fullWidth />
      </View>
    </ScrollView>
  );
}
