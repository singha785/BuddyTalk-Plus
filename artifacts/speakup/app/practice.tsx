import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
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
import { AI_FEEDBACK, AI_SUGGESTIONS, PARTNER_LINES } from "@/data/aiTips";
import { useColors } from "@/hooks/useColors";
import { showAlert } from "@/utils/alert";

type Stage = "matching" | "in-call" | "ended";

const PARTNERS = [
  { name: "Anika R.", initials: "AR", region: "Mumbai, India", level: "Intermediate", color: "#FF7A45" },
  { name: "Hassan M.", initials: "HM", region: "Lahore, Pakistan", level: "Beginner", color: "#5B3DFF" },
  { name: "Priya S.", initials: "PS", region: "Delhi, India", level: "Intermediate", color: "#16A085" },
  { name: "Arjun K.", initials: "AK", region: "Kathmandu, Nepal", level: "Advanced", color: "#F5A524" },
  { name: "Nadia A.", initials: "NA", region: "Tehran, Iran", level: "Intermediate", color: "#A93D00" },
  { name: "Tahmid R.", initials: "TR", region: "Dhaka, Bangladesh", level: "Beginner", color: "#0E6F5A" },
];

export default function PracticeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { freeMinutesRemaining, consumeFreeMinutes, recordCall } = useApp();

  const [stage, setStage] = useState<Stage>("matching");
  const [seconds, setSeconds] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(false);
  const [transcriptIndex, setTranscriptIndex] = useState<number>(0);
  const [tipIndex, setTipIndex] = useState<number>(0);
  const [partner, setPartner] = useState(
    () => PARTNERS[Math.floor(Math.random() * PARTNERS.length)],
  );

  const pulse = useRef(new Animated.Value(0)).current;

  // Pulsing animation on the avatar while connecting / talking
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Matching simulation: 2.5s then move to in-call
  useEffect(() => {
    if (stage !== "matching") return;
    const t = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      setStage("in-call");
    }, 2500);
    return () => clearTimeout(t);
  }, [stage]);

  // Tick seconds while in call
  useEffect(() => {
    if (stage !== "in-call") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [stage]);

  // Auto-end when free minutes hit zero
  useEffect(() => {
    if (stage !== "in-call") return;
    if (freeMinutesRemaining <= 0) endCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeMinutesRemaining, stage]);

  // Drive the partner transcript every 6 seconds
  useEffect(() => {
    if (stage !== "in-call") return;
    const id = setInterval(() => {
      setTranscriptIndex((i) => (i + 1) % PARTNER_LINES.length);
      setTipIndex((i) => (i + 1) % AI_SUGGESTIONS.length);
    }, 6000);
    return () => clearInterval(id);
  }, [stage]);

  // Charge free minutes per minute (rounded down) and on hangup
  useEffect(() => {
    if (stage !== "in-call") return;
    if (seconds > 0 && seconds % 60 === 0) {
      consumeFreeMinutes(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, stage]);

  const endCall = async () => {
    if (stage === "ended") return;
    const minutes = Math.max(1, Math.round(seconds / 60));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    const good = AI_FEEDBACK.good[Math.floor(Math.random() * AI_FEEDBACK.good.length)];
    const improve =
      AI_FEEDBACK.improve[Math.floor(Math.random() * AI_FEEDBACK.improve.length)];
    await recordCall({
      minutes,
      type: "practice",
      partnerName: partner.name,
      partnerInitials: partner.initials,
      partnerColor: partner.color,
      partnerRegion: partner.region,
      feedback: { good, improve },
    });
    setStage("ended");
  };

  const handleHangup = () => {
    if (stage === "matching") {
      router.back();
      return;
    }
    showAlert("End call?", "We'll save your progress and show feedback.", [
      { text: "Keep talking", style: "cancel" },
      { text: "End", style: "destructive", onPress: endCall },
    ]);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.18],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0],
  });

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
            partnerName={partner.name}
            onDone={() => router.back()}
            onAgain={() => {
              setStage("matching");
              setSeconds(0);
              setTranscriptIndex(0);
              setTipIndex(0);
              setPartner(PARTNERS[Math.floor(Math.random() * PARTNERS.length)]);
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
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <RNPressable
                onPress={handleHangup}
                hitSlop={12}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="chevron-down" size={20} color="#FFFFFF" />
              </RNPressable>
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    color: "#FFFFFF",
                    opacity: 0.7,
                    fontFamily: "Inter_500Medium",
                    fontSize: 11,
                    letterSpacing: 2,
                  }}
                >
                  {stage === "matching" ? "MATCHING" : "LIVE PRACTICE"}
                </Text>
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontFamily: "Inter_700Bold",
                    fontSize: 16,
                    marginTop: 2,
                  }}
                >
                  {stage === "matching" ? "Finding a partner…" : formatTime(seconds)}
                </Text>
              </View>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#16A085",
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#16A085",
                  shadowOpacity: 0.5,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 0 },
                }}
              >
                <Feather name="phone-call" size={16} color="#FFFFFF" />
              </View>
            </View>

            {/* Partner */}
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <View
                style={{
                  width: 160,
                  height: 160,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Animated.View
                  style={{
                    position: "absolute",
                    width: 160,
                    height: 160,
                    borderRadius: 80,
                    backgroundColor: partner.color,
                    opacity: pulseOpacity,
                    transform: [{ scale: pulseScale }],
                  }}
                />
                <Avatar initials={partner.initials} size={120} color={partner.color} />
              </View>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontFamily: "Inter_700Bold",
                  fontSize: 22,
                  marginTop: 18,
                }}
              >
                {partner.name}
              </Text>
              <Text
                style={{
                  color: "#FFFFFF",
                  opacity: 0.75,
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                {partner.region} · {partner.level}
              </Text>
            </View>

            {/* Transcript / AI tips */}
            {stage === "in-call" ? (
              <ScrollView
                style={{ flex: 1, marginTop: 32 }}
                contentContainerStyle={{ gap: 12 }}
                showsVerticalScrollIndicator={false}
              >
                <View
                  style={{
                    backgroundColor: "rgba(255,255,255,0.1)",
                    borderRadius: 18,
                    padding: 16,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      opacity: 0.65,
                      fontFamily: "Inter_500Medium",
                      fontSize: 11,
                      letterSpacing: 1.5,
                    }}
                  >
                    {partner.name.toUpperCase()} SAYS
                  </Text>
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontFamily: "Inter_500Medium",
                      fontSize: 16,
                      marginTop: 8,
                      lineHeight: 22,
                    }}
                  >
                    "{PARTNER_LINES[transcriptIndex]}"
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: "rgba(255,255,255,0.95)",
                    borderRadius: 18,
                    padding: 16,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 8,
                        backgroundColor: colors.primary,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather name="cpu" size={14} color="#FFFFFF" />
                    </View>
                    <Text
                      style={{
                        color: colors.primary,
                        fontFamily: "Inter_700Bold",
                        fontSize: 12,
                        letterSpacing: 1,
                      }}
                    >
                      AI COACH
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: "#1A1530",
                      fontFamily: "Inter_500Medium",
                      fontSize: 15,
                      marginTop: 10,
                      lineHeight: 20,
                    }}
                  >
                    {AI_SUGGESTIONS[tipIndex]}
                  </Text>
                </View>
              </ScrollView>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            {/* Controls */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 22,
                paddingTop: 12,
              }}
            >
              <RoundButton
                icon={muted ? "mic-off" : "mic"}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                    () => undefined,
                  );
                  setMuted((m) => !m);
                }}
                bg="rgba(255,255,255,0.15)"
              />
              <RoundButton
                icon="phone-off"
                onPress={handleHangup}
                bg="#E5484D"
                size={72}
              />
              <RoundButton
                icon="message-circle"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                    () => undefined,
                  );
                  setTipIndex((i) => (i + 1) % AI_SUGGESTIONS.length);
                }}
                bg="rgba(255,255,255,0.15)"
              />
            </View>
          </View>
        )}
      </View>
    </>
  );
}

function RoundButton({
  icon,
  onPress,
  bg,
  size = 60,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  onPress: () => void;
  bg: string;
  size?: number;
}) {
  return (
    <RNPressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      <Feather name={icon} size={size === 72 ? 28 : 22} color="#FFFFFF" />
    </RNPressable>
  );
}

function EndedView({
  seconds,
  partnerName,
  onDone,
  onAgain,
}: {
  seconds: number;
  partnerName: string;
  onDone: () => void;
  onAgain: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const minutes = Math.max(1, Math.round(seconds / 60));
  const goodTip = AI_FEEDBACK.good[Math.floor(Math.random() * AI_FEEDBACK.good.length)];
  const improveTip =
    AI_FEEDBACK.improve[Math.floor(Math.random() * AI_FEEDBACK.improve.length)];

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + (Platform.OS === "web" ? 67 : 24),
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 20,
      }}
    >
      <Text
        style={{
          color: "#FFFFFF",
          fontFamily: "Inter_700Bold",
          fontSize: 28,
          textAlign: "center",
          marginTop: 12,
        }}
      >
        Great session!
      </Text>
      <Text
        style={{
          color: "#FFFFFF",
          opacity: 0.85,
          fontFamily: "Inter_400Regular",
          fontSize: 14,
          textAlign: "center",
          marginTop: 8,
        }}
      >
        You spoke for {minutes} minute{minutes === 1 ? "" : "s"} with {partnerName}.
      </Text>

      <View style={{ marginTop: 32, gap: 12 }}>
        <Card>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: "#DDF5EE",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="thumbs-up" size={18} color="#0E6F5A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 14,
                  color: colors.foreground,
                }}
              >
                What went well
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  color: colors.mutedForeground,
                  marginTop: 4,
                  lineHeight: 18,
                }}
              >
                {goodTip}
              </Text>
            </View>
          </View>
        </Card>
        <Card>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: "#FFE9DD",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="trending-up" size={18} color="#A93D00" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 14,
                  color: colors.foreground,
                }}
              >
                One thing to try
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  color: colors.mutedForeground,
                  marginTop: 4,
                  lineHeight: 18,
                }}
              >
                {improveTip}
              </Text>
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
