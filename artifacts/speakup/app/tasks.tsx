import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable as RNPressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/Card";
import { CoinBadge } from "@/components/CoinBadge";
import { Pressable } from "@/components/Pressable";
import { ProgressBar } from "@/components/ProgressBar";
import { useApp } from "@/context/AppContext";
import { DAILY_TASKS, DailyTask } from "@/data/tasks";
import { useColors } from "@/hooks/useColors";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

const TYPE_ICONS: Record<DailyTask["type"], React.ComponentProps<typeof Feather>["name"]> = {
  speak: "mic",
  listen: "headphones",
  learn: "book-open",
  talk: "phone-call",
};

const TYPE_BG: Record<DailyTask["type"], string> = {
  speak: "#EAE2FF",
  listen: "#FFE9DD",
  learn: "#FFF1D6",
  talk: "#DDF5EE",
};

const TYPE_FG: Record<DailyTask["type"], string> = {
  speak: "#5B3DFF",
  listen: "#A93D00",
  learn: "#7A4A00",
  talk: "#0E6F5A",
};

const SELF_INTRO_MIN_WORDS = 15;

export default function TasksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, completeTask } = useApp();

  // ── Self-intro recording state ───────────────────────────────────────────────
  const [introOpen, setIntroOpen] = useState(false);
  const [introActive, setIntroActive] = useState(false);
  const [introText, setIntroText] = useState("");
  const introActiveRef = useRef(false);
  const accRef = useRef("");
  const micPulse = useRef(new Animated.Value(0)).current;

  const introWords = introText.trim().split(/\s+/).filter(Boolean).length;
  const introReady = introWords >= SELF_INTRO_MIN_WORDS;

  const onSpeechResult = useCallback((text: string) => {
    if (!text.trim()) return;
    const next = accRef.current ? `${accRef.current} ${text}` : text;
    accRef.current = next;
    setIntroText(next);
  }, []);

  const speech = useSpeechRecognition(onSpeechResult);

  // Auto-restart recognition until enough words are collected
  useEffect(() => {
    if (!introActive || speech.listening) return;
    if (introReady) return;
    const t = setTimeout(() => {
      if (introActiveRef.current) speech.startListening();
    }, 400);
    return () => clearTimeout(t);
  }, [introActive, speech.listening, introReady, speech]);

  useEffect(() => { introActiveRef.current = introActive; }, [introActive]);

  // Mic pulse animation
  useEffect(() => {
    if (!introActive) { micPulse.setValue(0); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(micPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(micPulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [introActive, micPulse]);

  const startIntroRecording = () => {
    setIntroText("");
    accRef.current = "";
    setIntroActive(true);
    speech.startListening();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  };

  const stopIntroRecording = () => {
    setIntroActive(false);
    speech.stopListening();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const closeIntro = () => {
    stopIntroRecording();
    setIntroOpen(false);
  };

  const completeIntroTask = async () => {
    await completeTask("task-self-intro", 10);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    closeIntro();
  };

  // ── Generic task completion ──────────────────────────────────────────────────
  const onComplete = async (t: DailyTask) => {
    await completeTask(t.id, t.reward);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => undefined,
    );
  };

  const total = DAILY_TASKS.length;
  const done = DAILY_TASKS.filter((t) => state.completedTasks.includes(t.id)).length;
  const pct = Math.round((done / total) * 100);

  const greetCount = state.greetedPartners.length;

  const micScale = micPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] });
  const micOpacity = micPulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <>
      <Stack.Screen
        options={{
          title: "Daily tasks",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleStyle: { fontFamily: "Inter_700Bold" },
        }}
      />
      <View style={{ flex: 1, backgroundColor: colors.background }}>

        {/* ── Self-intro recording overlay ─────────────────────────────────── */}
        {introOpen ? (
          <View style={{
            position: "absolute", inset: 0, zIndex: 100,
            backgroundColor: "rgba(26,21,48,0.96)",
            paddingTop: insets.top + (Platform.OS === "web" ? 72 : 24),
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 24,
            justifyContent: "space-between",
          }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 20 }}>
                Self-introduction
              </Text>
              <RNPressable
                onPress={closeIntro}
                hitSlop={12}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }}
              >
                <Feather name="x" size={18} color="#FFFFFF" />
              </RNPressable>
            </View>

            {/* Instructions */}
            <View style={{ alignItems: "center", flex: 1, justifyContent: "center", gap: 32 }}>
              <Text style={{ color: "#FFFFFF", opacity: 0.75, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 22 }}>
                Speak about yourself — your name, where you're from, what you do, and your hobbies. Keep going until the counter reaches 15 words.
              </Text>

              {/* Mic button with pulse */}
              <View style={{ alignItems: "center", justifyContent: "center", width: 120, height: 120 }}>
                {introActive ? (
                  <Animated.View style={{
                    position: "absolute", width: 120, height: 120, borderRadius: 60,
                    backgroundColor: "#5B3DFF", opacity: micOpacity, transform: [{ scale: micScale }],
                  }} />
                ) : null}
                <RNPressable
                  onPress={introActive ? stopIntroRecording : startIntroRecording}
                  style={{
                    width: 88, height: 88, borderRadius: 44,
                    backgroundColor: introActive ? "#5B3DFF" : "rgba(91,61,255,0.25)",
                    borderWidth: 2, borderColor: "#5B3DFF",
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Feather name={introActive ? "mic" : "mic-off"} size={34} color={introActive ? "#FFFFFF" : "#9B8FFF"} />
                </RNPressable>
              </View>

              {/* Word count */}
              <View style={{ alignItems: "center", gap: 8 }}>
                <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 40 }}>
                  {introWords}
                </Text>
                <Text style={{ color: "#FFFFFF", opacity: 0.6, fontFamily: "Inter_500Medium", fontSize: 14 }}>
                  {introReady ? "✓ Great! Ready to complete." : `words spoken (need ${SELF_INTRO_MIN_WORDS})`}
                </Text>
              </View>

              {/* Live transcript preview */}
              {introText.length > 0 ? (
                <View style={{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 16, width: "100%" }}>
                  <Text style={{ color: "#FFFFFF", opacity: 0.8, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 }} numberOfLines={4}>
                    "{introText}"
                  </Text>
                </View>
              ) : null}

              {/* Error */}
              {speech.error ? (
                <Text style={{ color: "#FF7A45", fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "center" }}>
                  {speech.error}
                </Text>
              ) : null}

              {!speech.supported ? (
                <Text style={{ color: "#FF7A45", fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "center" }}>
                  Speech recognition is not supported on this browser. Try Chrome or Edge.
                </Text>
              ) : null}
            </View>

            {/* Action button */}
            <View style={{ gap: 12 }}>
              {introReady ? (
                <RNPressable
                  onPress={() => { void completeIntroTask(); }}
                  style={{ backgroundColor: "#16A085", paddingVertical: 16, borderRadius: 16, alignItems: "center" }}
                >
                  <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 16 }}>
                    Complete task (+10 coins)
                  </Text>
                </RNPressable>
              ) : null}
              <RNPressable
                onPress={introActive ? stopIntroRecording : startIntroRecording}
                style={{ backgroundColor: introActive ? "rgba(229,72,77,0.2)" : "rgba(91,61,255,0.2)", paddingVertical: 14, borderRadius: 16, alignItems: "center" }}
              >
                <Text style={{ color: introActive ? "#E5484D" : "#9B8FFF", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                  {introActive ? "Pause recording" : "Start recording"}
                </Text>
              </RNPressable>
            </View>
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={{
            paddingTop: Platform.OS === "web" ? 24 : 16,
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.mutedForeground }}>
                  Today's progress
                </Text>
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 22, color: colors.foreground, marginTop: 6 }}>
                  {done} / {total} done
                </Text>
              </View>
              <View style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "#FFF1D6" }}>
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: "#7A4A00" }}>
                  +{DAILY_TASKS.reduce((s, t) => s + t.reward, 0)} coins possible
                </Text>
              </View>
            </View>
            <View style={{ marginTop: 16 }}>
              <ProgressBar value={pct} color={colors.primary} />
            </View>
          </Card>

          <View style={{ gap: 10, marginTop: 18 }}>
            {DAILY_TASKS.map((t) => {
              const isDone = state.completedTasks.includes(t.id);
              const isGreetTask = t.id === "task-greet-5";
              const isIntroTask = t.id === "task-self-intro";
              const isTalkTask = t.type === "talk";

              let actionLabel = "Done";
              if (isTalkTask) actionLabel = "Start";
              else if (isGreetTask) actionLabel = "Practice";
              else if (isIntroTask) actionLabel = "Record";

              const handlePress = () => {
                if (isTalkTask || isGreetTask) {
                  router.push("/practice");
                } else if (isIntroTask) {
                  setIntroOpen(true);
                } else {
                  void onComplete(t);
                }
              };

              return (
                <Card key={t.id}>
                  <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
                    <View style={{
                      width: 46, height: 46, borderRadius: 14,
                      backgroundColor: isDone ? colors.muted : TYPE_BG[t.type],
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Feather
                        name={isDone ? "check" : TYPE_ICONS[t.type]}
                        size={20}
                        color={isDone ? colors.mutedForeground : TYPE_FG[t.type]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 15, color: colors.foreground }}>
                          {t.title}
                        </Text>
                        {isDone ? (
                          <Feather name="check-circle" size={14} color={colors.success} />
                        ) : null}
                      </View>
                      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground, marginTop: 4, lineHeight: 18 }}>
                        {t.description}
                      </Text>

                      {/* Greet task progress bar */}
                      {isGreetTask && !isDone ? (
                        <View style={{ marginTop: 10 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: colors.mutedForeground }}>
                              People greeted
                            </Text>
                            <Text style={{ fontFamily: "Inter_700Bold", fontSize: 12, color: colors.primary }}>
                              {greetCount} / 5
                            </Text>
                          </View>
                          <ProgressBar value={Math.round((greetCount / 5) * 100)} color={colors.primary} />
                          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground, marginTop: 6 }}>
                            Each completed call counts as one greeting.
                          </Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Feather name="clock" size={11} color={colors.mutedForeground} />
                            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 11, color: colors.mutedForeground }}>
                              {t.minutes} min
                            </Text>
                          </View>
                          <CoinBadge amount={t.reward} size="sm" />
                        </View>
                      )}
                    </View>

                    {isDone ? (
                      <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.muted }}>
                        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: colors.mutedForeground }}>
                          Done ✓
                        </Text>
                      </View>
                    ) : (
                      <Pressable onPress={handlePress}>
                        <View style={{
                          paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
                          backgroundColor: isGreetTask && greetCount > 0 ? "#5B3DFF22" : colors.primary,
                          borderWidth: isGreetTask && greetCount > 0 ? 1 : 0,
                          borderColor: colors.primary,
                        }}>
                          <Text style={{
                            color: isGreetTask && greetCount > 0 ? colors.primary : "#FFFFFF",
                            fontFamily: "Inter_700Bold", fontSize: 12,
                          }}>
                            {actionLabel}
                          </Text>
                        </View>
                      </Pressable>
                    )}
                  </View>
                </Card>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </>
  );
}
