import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
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
import { useApp } from "@/context/AppContext";
import { LESSONS } from "@/data/lessons";
import { useColors } from "@/hooks/useColors";

export default function LessonScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = LESSONS.find((l) => l.id === id);
  const { completeLesson, addCoins } = useApp();

  const [step, setStep] = useState<number>(0);
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [speaking, setSpeaking] = useState(false);
  const speakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const speakPhrase = useCallback(
    (text: string) => {
      Speech.stop();
      setSpeaking(true);
      Speech.speak(text, {
        language: "en-IN",
        pitch: 1.0,
        rate: Platform.OS === "web" ? 0.85 : 0.9,
        onDone: () => setSpeaking(false),
        onError: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
      });
    },
    [],
  );

  useEffect(() => {
    if (!lesson) return;
    const text = lesson.items[step]?.text;
    if (!text) return;
    if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    speakTimerRef.current = setTimeout(() => speakPhrase(text), 600);
    return () => {
      if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
      Speech.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, lesson?.id]);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  if (!lesson) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
          Lesson not found.
        </Text>
        <View style={{ marginTop: 12 }}>
          <Button label="Go back" variant="outline" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const total = lesson.items.length;
  const current = lesson.items[step];
  const pct = ((step + 1) / total) * 100;
  const completed = step >= total - 1 && marked.has(step);

  const markRepeated = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    setMarked((prev) => {
      const next = new Set(prev);
      next.add(step);
      return next;
    });
  };

  const next = async () => {
    Speech.stop();
    if (step < total - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      setStep((s) => s + 1);
    } else {
      await completeLesson(lesson.id);
      await addCoins(5);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      router.back();
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: lesson.title,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleStyle: { fontFamily: "Inter_700Bold" },
        }}
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <Pill
              label={lesson.level}
              tone={
                lesson.level === "Beginner"
                  ? "primary"
                  : lesson.level === "Intermediate"
                  ? "accent"
                  : "warning"
              }
            />
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 12,
                color: colors.mutedForeground,
              }}
            >
              {lesson.minutes} min
            </Text>
          </View>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              color: colors.mutedForeground,
              lineHeight: 20,
            }}
          >
            {lesson.description}
          </Text>

          <View style={{ marginTop: 16 }}>
            <ProgressBar value={pct} color={colors.primary} />
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 12,
                color: colors.mutedForeground,
                marginTop: 8,
              }}
            >
              Step {step + 1} of {total}
            </Text>
          </View>

          <LinearGradient
            colors={["#5B3DFF", "#7456FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 24,
              padding: 28,
              minHeight: 220,
              justifyContent: "center",
              marginTop: 24,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text
                style={{
                  color: "#FFFFFF",
                  opacity: 0.65,
                  fontFamily: "Inter_500Medium",
                  fontSize: 11,
                  letterSpacing: 2,
                }}
              >
                LISTEN & REPEAT
              </Text>
              <RNPressable
                onPress={() => speakPhrase(current?.text ?? "")}
                hitSlop={10}
                style={({ pressed }) => ({
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: speaking
                    ? "rgba(255,255,255,0.35)"
                    : "rgba(255,255,255,0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <Feather
                  name={speaking ? "volume-2" : "volume-1"}
                  size={18}
                  color="#FFFFFF"
                />
              </RNPressable>
            </View>
            <Text
              style={{
                color: "#FFFFFF",
                fontFamily: "Inter_700Bold",
                fontSize: 28,
                lineHeight: 36,
                marginTop: 12,
              }}
            >
              {current?.text ?? ""}
            </Text>
            {current?.hint ? (
              <Text
                style={{
                  color: "#FFFFFF",
                  opacity: 0.85,
                  fontFamily: "Inter_400Regular",
                  fontSize: 14,
                  marginTop: 12,
                }}
              >
                Pronounce as: {current.hint}
              </Text>
            ) : null}
            {speaking && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <View
                    key={i}
                    style={{
                      width: 3,
                      height: 8 + (i % 3) * 6,
                      borderRadius: 2,
                      backgroundColor: "rgba(255,255,255,0.7)",
                    }}
                  />
                ))}
                <Text style={{ color: "rgba(255,255,255,0.7)", fontFamily: "Inter_500Medium", fontSize: 11, marginLeft: 4 }}>
                  AI speaking…
                </Text>
              </View>
            )}
          </LinearGradient>

          <Card style={{ marginTop: 18 }}>
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: "#EAE2FF",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="cpu" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 13,
                    color: colors.foreground,
                  }}
                >
                  Coach tip
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
                  Listen to the AI pronunciation, then speak the phrase aloud yourself. Tap the speaker icon to replay anytime.
                </Text>
              </View>
            </View>
          </Card>

          <View style={{ marginTop: 24, gap: 12 }}>
            <RNPressable
              onPress={markRepeated}
              style={({ pressed }) => ({
                backgroundColor: marked.has(step) ? colors.success : colors.card,
                borderRadius: 999,
                paddingVertical: 16,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 10,
                borderWidth: 1.5,
                borderColor: marked.has(step) ? colors.success : colors.border,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Feather
                name={marked.has(step) ? "check-circle" : "mic"}
                size={18}
                color={marked.has(step) ? "#FFFFFF" : colors.foreground}
              />
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 15,
                  color: marked.has(step) ? "#FFFFFF" : colors.foreground,
                }}
              >
                {marked.has(step) ? "Repeated aloud" : "I said it aloud"}
              </Text>
            </RNPressable>

            <Button
              label={completed || step === total - 1 ? "Finish lesson" : "Next phrase"}
              icon={completed || step === total - 1 ? "check" : "arrow-right"}
              onPress={next}
              fullWidth
              disabled={!marked.has(step)}
              size="lg"
            />
          </View>
        </ScrollView>
      </View>
    </>
  );
}
