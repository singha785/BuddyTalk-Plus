import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable as RNPressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { ProgressBar } from "@/components/ProgressBar";
import { VoiceSelector } from "@/components/VoiceSelector";
import { useApp } from "@/context/AppContext";
import { LESSONS } from "@/data/lessons";
import { useColors } from "@/hooks/useColors";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useVoicePreference } from "@/hooks/useVoicePreference";
import {
  PASS_THRESHOLD,
  scorePronunciation,
  scoreColor,
  scoreLabel,
  type PronunciationScore,
} from "@/utils/pronunciationScore";

type Phase = "idle" | "speaking" | "listening" | "scored";

export default function LessonScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = LESSONS.find((l) => l.id === id);
  const { completeLesson, addCoins, savePronunciationScore } = useApp();
  const { selectedVoice, setVoice, speak, stop } = useVoicePreference();

  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState<PronunciationScore | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [passedSteps, setPassedSteps] = useState<Set<number>>(new Set());
  const [voicePickerVisible, setVoicePickerVisible] = useState(false);

  const speakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const handleRecognitionResult = useCallback(
    (transcript: string) => {
      if (!lesson) return;
      const expected = lesson.items[step]?.text ?? "";
      const result = scorePronunciation(expected, transcript);
      setScore(result);
      setAttempts((a) => a + 1);
      setPhase("scored");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      void savePronunciationScore(lesson.id, result);
    },
    [lesson, step, savePronunciationScore],
  );

  const stt = useSpeechRecognition(handleRecognitionResult);

  const speakCurrent = useCallback(
    (text: string) => {
      stt.stopListening();
      setPhase("speaking");
      speak(text, () => setPhase("idle"));
    },
    [speak, stt],
  );

  useEffect(() => {
    if (!lesson) return;
    const text = lesson.items[step]?.text;
    if (!text) return;
    setPhase("idle");
    setScore(null);
    setAttempts(0);
    stt.reset();
    if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    speakTimerRef.current = setTimeout(() => speakCurrent(text), 700);
    return () => {
      if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, lesson?.id]);

  useEffect(() => {
    return () => { stop(); stt.stopListening(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === "listening") {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.18, duration: 550, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 550, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [phase, pulseAnim]);

  if (!lesson) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>Lesson not found.</Text>
        <View style={{ marginTop: 12 }}>
          <Button label="Go back" variant="outline" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const total = lesson.items.length;
  const current = lesson.items[step];
  const pct = (step / total) * 100 + (passedSteps.has(step) ? 100 / total : 0);
  const passed = score !== null && score.overall >= PASS_THRESHOLD;
  const allDone = passedSteps.size === total;

  const handleStartListening = () => {
    stop();
    stt.reset();
    setPhase("listening");
    stt.startListening(selectedVoice.language);
  };

  const handleStopListening = () => {
    stt.stopListening();
    setPhase("idle");
  };

  const handleRetry = () => {
    stt.reset();
    setScore(null);
    setPhase("idle");
    speakCurrent(current?.text ?? "");
  };

  const handleNext = async () => {
    const nextPassed = new Set(passedSteps);
    nextPassed.add(step);
    setPassedSteps(nextPassed);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

    if (step < total - 1) {
      setStep((s) => s + 1);
    } else {
      await completeLesson(lesson.id);
      await addCoins(5);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      router.back();
    }
  };

  const handleManualPass = async () => {
    const fake = scorePronunciation(current?.text ?? "", current?.text ?? "");
    setScore(fake);
    setPhase("scored");
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: lesson.title,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleStyle: { fontFamily: "Inter_700Bold" },
          headerRight: () => (
            <RNPressable
              onPress={() => setVoicePickerVisible(true)}
              hitSlop={10}
              style={{ marginRight: 4, flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text style={{ fontSize: 18 }}>{selectedVoice.flag}</Text>
              <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
            </RNPressable>
          ),
        }}
      />
      <VoiceSelector
        visible={voicePickerVisible}
        selected={selectedVoice}
        onSelect={(vid) => void setVoice(vid)}
        onClose={() => setVoicePickerVisible(false)}
      />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: Platform.OS === "web" ? 24 : 8,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Meta row */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Pill
              label={lesson.level}
              tone={lesson.level === "Beginner" ? "primary" : lesson.level === "Intermediate" ? "accent" : "warning"}
            />
            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: colors.mutedForeground }}>
              {lesson.minutes} min
            </Text>
            <View style={{ flex: 1 }} />
            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 11, color: colors.mutedForeground }}>
              {passedSteps.size}/{total} passed
            </Text>
          </View>

          {/* Progress */}
          <ProgressBar value={pct} color={colors.primary} />
          <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: colors.mutedForeground, marginTop: 6, marginBottom: 18 }}>
            Step {step + 1} of {total}
            {attempts > 0 ? ` · ${attempts} attempt${attempts === 1 ? "" : "s"}` : ""}
          </Text>

          {/* Phrase card */}
          <LinearGradient
            colors={passedSteps.has(step) ? ["#0E6F5A", "#16A085"] : ["#5B3DFF", "#7456FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 24, padding: 24, minHeight: 200, justifyContent: "center" }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: "#FFFFFF", opacity: 0.65, fontFamily: "Inter_500Medium", fontSize: 10, letterSpacing: 2 }}>
                {phase === "speaking" ? "AI SPEAKING…" : "LISTEN & REPEAT"}
              </Text>
              <RNPressable
                onPress={() => speakCurrent(current?.text ?? "")}
                disabled={phase === "listening"}
                hitSlop={10}
                style={({ pressed }) => ({
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: phase === "speaking" ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)",
                  alignItems: "center", justifyContent: "center",
                  opacity: phase === "listening" ? 0.4 : pressed ? 0.75 : 1,
                })}
              >
                <Feather name={phase === "speaking" ? "volume-2" : "volume-1"} size={16} color="#FFFFFF" />
              </RNPressable>
            </View>
            <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 26, lineHeight: 34, marginTop: 14 }}>
              {current?.text ?? ""}
            </Text>
            {current?.hint ? (
              <Text style={{ color: "#FFFFFF", opacity: 0.85, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 10 }}>
                Pronounce: {current.hint}
              </Text>
            ) : null}
            {passedSteps.has(step) && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 }}>
                <Feather name="check-circle" size={16} color="#FFFFFF" />
                <Text style={{ color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Passed</Text>
              </View>
            )}
          </LinearGradient>

          {/* Score card — shown after attempt */}
          {score !== null && phase === "scored" && (
            <Card style={{ marginTop: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <View style={{
                  width: 52, height: 52, borderRadius: 14,
                  backgroundColor: scoreColor(score.overall) + "22",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Text style={{ fontFamily: "Inter_700Bold", fontSize: 18, color: scoreColor(score.overall) }}>
                    {score.overall}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontFamily: "Inter_700Bold", fontSize: 15, color: colors.foreground }}>
                    {scoreLabel(score.overall)}
                  </Text>
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 1 }}>
                    Overall speaking score
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                {[
                  { label: "Accuracy", value: score.accuracy },
                  { label: "Fluency", value: score.fluency },
                  { label: "Complete", value: score.completeness },
                ].map((m) => (
                  <View key={m.label} style={{ flex: 1, backgroundColor: colors.muted, borderRadius: 10, padding: 10, alignItems: "center" }}>
                    <Text style={{ fontFamily: "Inter_700Bold", fontSize: 16, color: scoreColor(m.value) }}>
                      {m.value}%
                    </Text>
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 10, color: colors.mutedForeground, marginTop: 2 }}>
                      {m.label}
                    </Text>
                  </View>
                ))}
              </View>

              {score.transcript.length > 0 && (
                <View style={{ backgroundColor: colors.muted, borderRadius: 10, padding: 10, marginBottom: 10 }}>
                  <Text style={{ fontFamily: "Inter_500Medium", fontSize: 11, color: colors.mutedForeground, marginBottom: 2 }}>
                    YOU SAID
                  </Text>
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.foreground, fontStyle: "italic" }}>
                    "{score.transcript}"
                  </Text>
                </View>
              )}

              {score.missedWords.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                  <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: colors.mutedForeground, width: "100%", marginBottom: 2 }}>
                    Missed words:
                  </Text>
                  {score.missedWords.map((w, i) => (
                    <View key={i} style={{ backgroundColor: "#FFE9DD", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#A93D00" }}>{w}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          )}

          {/* STT error */}
          {stt.error && (
            <View style={{ backgroundColor: "#FFE9DD", borderRadius: 12, padding: 12, marginTop: 12 }}>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: "#A93D00" }}>
                {stt.error}
              </Text>
            </View>
          )}

          {/* Mic controls */}
          {!passedSteps.has(step) && (
            <View style={{ marginTop: 20, gap: 10 }}>
              {phase === "idle" || phase === "speaking" ? (
                <>
                  {stt.supported ? (
                    <RNPressable
                      onPress={handleStartListening}
                      disabled={phase === "speaking"}
                      style={({ pressed }) => ({
                        backgroundColor: phase === "speaking" ? colors.muted : colors.primary,
                        borderRadius: 999,
                        paddingVertical: 18,
                        alignItems: "center",
                        flexDirection: "row",
                        justifyContent: "center",
                        gap: 10,
                        opacity: phase === "speaking" ? 0.6 : pressed ? 0.88 : 1,
                      })}
                    >
                      <Feather name="mic" size={20} color="#FFFFFF" />
                      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 15, color: "#FFFFFF" }}>
                        {phase === "speaking" ? "Wait for AI…" : "Start speaking"}
                      </Text>
                    </RNPressable>
                  ) : (
                    <RNPressable
                      onPress={handleManualPass}
                      style={({ pressed }) => ({
                        backgroundColor: colors.card,
                        borderRadius: 999,
                        paddingVertical: 16,
                        alignItems: "center",
                        flexDirection: "row",
                        justifyContent: "center",
                        gap: 10,
                        borderWidth: 1.5,
                        borderColor: colors.border,
                        opacity: pressed ? 0.9 : 1,
                      })}
                    >
                      <Feather name="mic" size={18} color={colors.foreground} />
                      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 15, color: colors.foreground }}>
                        I said it aloud
                      </Text>
                    </RNPressable>
                  )}
                </>
              ) : phase === "listening" ? (
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <RNPressable
                    onPress={handleStopListening}
                    style={{
                      backgroundColor: "#E5484D",
                      borderRadius: 999,
                      paddingVertical: 18,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: 10,
                    }}
                  >
                    <Feather name="square" size={18} color="#FFFFFF" />
                    <Text style={{ fontFamily: "Inter_700Bold", fontSize: 15, color: "#FFFFFF" }}>
                      Listening… tap to stop
                    </Text>
                  </RNPressable>
                </Animated.View>
              ) : null}

              {/* scored state controls */}
              {phase === "scored" && !passed && (
                <View style={{ gap: 10 }}>
                  <Button
                    label="Try again"
                    icon="refresh-cw"
                    onPress={handleRetry}
                    fullWidth
                    size="lg"
                  />
                  {attempts >= 3 && (
                    <RNPressable
                      onPress={() => {
                        const nextPassed = new Set(passedSteps);
                        nextPassed.add(step);
                        setPassedSteps(nextPassed);
                        void handleNext();
                      }}
                      style={({ pressed }) => ({
                        alignItems: "center",
                        paddingVertical: 10,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.mutedForeground }}>
                        Skip this one →
                      </Text>
                    </RNPressable>
                  )}
                </View>
              )}

              {phase === "scored" && passed && (
                <Button
                  label={step === total - 1 ? "Finish lesson  🎉" : "Next phrase"}
                  icon={step === total - 1 ? "check" : "arrow-right"}
                  onPress={handleNext}
                  fullWidth
                  size="lg"
                />
              )}
            </View>
          )}

          {/* Already passed this step */}
          {passedSteps.has(step) && (
            <View style={{ marginTop: 20 }}>
              <Button
                label={step === total - 1 ? "Finish lesson  🎉" : "Next phrase"}
                icon={step === total - 1 ? "check" : "arrow-right"}
                onPress={handleNext}
                fullWidth
                size="lg"
              />
            </View>
          )}

          {/* Coach tip */}
          <Card style={{ marginTop: 16 }}>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#EAE2FF", alignItems: "center", justifyContent: "center" }}>
                <Feather name="cpu" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: colors.foreground }}>Coach tip</Text>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground, marginTop: 4, lineHeight: 18 }}>
                  {stt.supported
                    ? "Listen to the AI voice, then tap \"Start speaking\" and say the phrase. You need 60% or higher to pass."
                    : "Listen carefully and speak the phrase aloud. Tap the speaker button to replay anytime."}
                </Text>
              </View>
            </View>
          </Card>
        </ScrollView>
      </View>
    </>
  );
}
