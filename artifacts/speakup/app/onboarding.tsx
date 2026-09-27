import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import AvatarViewer from "@/components/AvatarViewer";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { LANGUAGE_OPTIONS } from "@/components/LanguageSelector";
import { Pressable } from "@/components/Pressable";
import { useApp, AppLanguage, UserGoal, UserLevel } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const GOALS: { id: UserGoal; label: string; sub: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
  { id: "job", label: "Better Job", sub: "Interviews, workplace, calls", icon: "briefcase" },
  { id: "study", label: "Studies", sub: "Exams, classroom, presentations", icon: "book-open" },
  { id: "daily", label: "Daily Talk", sub: "Friends, family, daily life", icon: "message-circle" },
  { id: "travel", label: "Travel", sub: "Airports, hotels, asking around", icon: "globe" },
];

const LEVELS: { id: UserLevel; label: string; sub: string; emoji: string }[] = [
  { id: "Beginner", label: "Beginner", sub: "I know very few words", emoji: "🌱" },
  { id: "Intermediate", label: "Intermediate", sub: "I can hold a basic chat", emoji: "🌿" },
  { id: "Advanced", label: "Advanced", sub: "I can speak fluently", emoji: "🌳" },
];

export default function Onboarding() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completeOnboarding, setLanguage } = useApp();
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [language, setSelectedLanguage] = useState<AppLanguage | null>(null);
  const [name, setName] = useState<string>("");
  const [goal, setGoal] = useState<UserGoal | null>(null);
  const [level, setLevel] = useState<UserLevel | null>(null);

  const next = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setStep((s) => (s < 4 ? ((s + 1) as 0 | 1 | 2 | 3 | 4) : s));
  };

  const finish = async () => {
    if (!name.trim() || !goal || !level) return;
    await completeOnboarding({ name: name.trim(), goal, level });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => undefined,
    );
    router.replace("/");
  };

  const canContinue =
    (step === 0) ||
    (step === 1 && language !== null) ||
    (step === 2 && name.trim().length > 0) ||
    (step === 3 && goal !== null) ||
    (step === 4 && level !== null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={["#5B3DFF", "#8E6BFF", "#FFE9DD"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 380,
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 24),
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 20,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.progressRow}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  marginHorizontal: 3,
                  backgroundColor:
                    i <= step ? "#FFFFFF" : "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </View>

          {step === 0 ? (
            <View style={{ marginTop: 60, paddingHorizontal: 6 }}>
              <AvatarViewer speaking={false} style={{ height: 220, marginBottom: -10 }} />
              <Text style={styles.heroEyebrow}>BuddyTalk+</Text>
              <Text style={styles.heroTitle}>
                Speak English{"\n"}with confidence.
              </Text>
              <Text style={styles.heroSub}>
                Practice with real people and your AI coach. Earn coins, build
                streaks, even teach others.
              </Text>
              <View style={{ marginTop: 32 }}>
                <Button label="Get started" icon="arrow-right" onPress={next} fullWidth size="lg" />
              </View>
              <Text
                style={{
                  textAlign: "center",
                  color: "#FFFFFF",
                  opacity: 0.85,
                  marginTop: 18,
                  fontFamily: "Inter_500Medium",
                  fontSize: 13,
                }}
              >
                Free 20 minutes daily â€¢ No credit card
              </Text>
            </View>
          ) : null}

          {step === 1 ? (
            <View style={{ marginTop: 40 }}>
              <Text style={styles.stepTitle}>Choose your language</Text>
              <Text style={styles.stepSub}>
                Choose the language you want BuddyTalk+ to use for app instructions and AI guidance.
              </Text>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ marginTop: 22, maxHeight: 420 }}
                contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
              >
                {LANGUAGE_OPTIONS.map((option) => {
                  const selected = language === option.id;

                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => setSelectedLanguage(option.id)}
                      style={{
                        borderWidth: 1,
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected
                          ? colors.primary + "12"
                          : colors.card,
                        borderRadius: 16,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 16,
                            color: colors.foreground,
                          }}
                        >
                          {option.nativeLabel}
                        </Text>
                        <Text
                          style={{
                            marginTop: 3,
                            fontFamily: "Inter_400Regular",
                            fontSize: 13,
                            color: colors.mutedForeground,
                          }}
                        >
                          {option.label}
                        </Text>
                      </View>

                      {selected ? (
                        <Feather
                          name="check-circle"
                          size={22}
                          color={colors.primary}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={{ marginTop: 20 }}>
                <Button
                  label="Continue"
                  icon="arrow-right"
                  onPress={async () => {
                    if (language) await setLanguage(language);
                    next();
                  }}
                  disabled={!canContinue}
                  fullWidth
                  size="lg"
                />
              </View>
            </View>
          ) : null}
          {step === 2 ? (
            <View style={{ marginTop: 60 }}>
              <Text style={styles.stepTitle}>What should we call you?</Text>
              <Text style={styles.stepSub}>
                We'll use it to greet you in the app.
              </Text>
              <View
                style={{
                  marginTop: 24,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 18,
                  paddingHorizontal: 16,
                  height: 58,
                  justifyContent: "center",
                }}
              >
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your first name"
                  placeholderTextColor={colors.mutedForeground}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => canContinue && next()}
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 17,
                    color: colors.foreground,
                  }}
                />
              </View>
              <View style={{ marginTop: 24 }}>
                <Button label="Continue" icon="arrow-right" onPress={next} disabled={!canContinue} fullWidth size="lg" />
              </View>
            </View>
          ) : null}

          {step === 3 ? (
            <View style={{ marginTop: 40 }}>
              <Text style={styles.stepTitle}>Why are you learning?</Text>
              <Text style={styles.stepSub}>Pick one â€” you can change later.</Text>
              <View style={{ gap: 12, marginTop: 24 }}>
                {GOALS.map((g) => {
                  const active = goal === g.id;
                  return (
                    <Pressable
                      key={g.id}
                      onPress={() => setGoal(g.id)}
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: 18,
                        padding: 16,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 14,
                        borderWidth: 2,
                        borderColor: active ? colors.primary : "transparent",
                      }}
                    >
                      <View
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 14,
                          backgroundColor: active ? colors.primary : "#EAE2FF",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Feather
                          name={g.icon}
                          size={22}
                          color={active ? "#FFFFFF" : colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: "Inter_700Bold",
                            fontSize: 16,
                            color: colors.foreground,
                          }}
                        >
                          {g.label}
                        </Text>
                        <Text
                          style={{
                            fontFamily: "Inter_400Regular",
                            fontSize: 13,
                            color: colors.mutedForeground,
                            marginTop: 2,
                          }}
                        >
                          {g.sub}
                        </Text>
                      </View>
                      {active ? (
                        <Feather
                          name="check-circle"
                          size={20}
                          color={colors.primary}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ marginTop: 24 }}>
                <Button label="Continue" icon="arrow-right" onPress={next} disabled={!canContinue} fullWidth size="lg" />
              </View>
            </View>
          ) : null}

          {step === 4 ? (
            <View style={{ marginTop: 40 }}>
              <Text style={styles.stepTitle}>How well do you speak?</Text>
              <Text style={styles.stepSub}>
                We'll match you with the right partners.
              </Text>
              <View style={{ gap: 12, marginTop: 24 }}>
                {LEVELS.map((l) => {
                  const active = level === l.id;
                  return (
                    <Pressable
                      key={l.id}
                      onPress={() => setLevel(l.id)}
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: 18,
                        padding: 18,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 14,
                        borderWidth: 2,
                        borderColor: active ? colors.primary : "transparent",
                      }}
                    >
                      <Text style={{ fontSize: 30 }}>{l.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: "Inter_700Bold",
                            fontSize: 16,
                            color: colors.foreground,
                          }}
                        >
                          {l.label}
                        </Text>
                        <Text
                          style={{
                            fontFamily: "Inter_400Regular",
                            fontSize: 13,
                            color: colors.mutedForeground,
                            marginTop: 2,
                          }}
                        >
                          {l.sub}
                        </Text>
                      </View>
                      {active ? (
                        <Feather
                          name="check-circle"
                          size={20}
                          color={colors.primary}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ marginTop: 24 }}>
                <Button label="Start practicing" icon="play" onPress={finish} disabled={!canContinue} fullWidth size="lg" />
              </View>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  progressRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  heroEyebrow: {
    color: "#FFFFFF",
    opacity: 0.9,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    letterSpacing: 3,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 40,
    lineHeight: 46,
    marginTop: 14,
  },
  heroSub: {
    color: "#FFFFFF",
    opacity: 0.92,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 16,
  },
  stepTitle: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    lineHeight: 34,
  },
  stepSub: {
    color: "#FFFFFF",
    opacity: 0.9,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    marginTop: 8,
  },
});












