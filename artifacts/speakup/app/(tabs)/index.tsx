import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { Card } from "@/components/Card";
import { CoinBadge } from "@/components/CoinBadge";
import { Pill } from "@/components/Pill";
import { Pressable } from "@/components/Pressable";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionHeader } from "@/components/SectionHeader";
import { CONSTANTS, useApp } from "@/context/AppContext";
import { DAILY_TASKS } from "@/data/tasks";
import { LESSONS } from "@/data/lessons";
import { MENTORS } from "@/data/mentors";
import { useColors } from "@/hooks/useColors";

export default function Home() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, freeMinutesRemaining } = useApp();

  const firstName = state.profile.name?.split(" ")[0] || "Friend";
  const totalAllowed = state.premium
    ? CONSTANTS.FREE_DAILY_MINUTES + 20
    : CONSTANTS.FREE_DAILY_MINUTES;
  const usedPct = ((totalAllowed - freeMinutesRemaining) / totalAllowed) * 100;

  const undoneTasks = DAILY_TASKS.filter(
    (t) => !state.completedTasks.includes(t.id),
  ).slice(0, 3);

  const recommendedLessons = LESSONS.filter(
    (l) => l.level === state.profile.level || state.profile.level === null,
  ).slice(0, 4);

  const onlineMentors = MENTORS.filter((m) => m.online).slice(0, 4);

  const greeting = (() => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12),
          paddingBottom: insets.bottom + 120,
        }}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Avatar
                initials={(firstName[0] || "S").toUpperCase()}
                size={44}
                color={colors.primary}
              />
              <View>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 13,
                    color: colors.mutedForeground,
                  }}
                >
                  {greeting}
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 18,
                    color: colors.foreground,
                  }}
                >
                  {firstName}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  backgroundColor: "#FFE9DD",
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                }}
              >
                <Text style={{ fontSize: 14 }}>🔥</Text>
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 13,
                    color: "#A93D00",
                  }}
                >
                  {state.streak}
                </Text>
              </View>
              <CoinBadge amount={state.coins} />
            </View>
          </View>

          {/* Talk time card */}
          <View style={{ marginTop: 22 }}>
            <Pressable onPress={() => router.push("/practice")}>
              <LinearGradient
                colors={["#5B3DFF", "#7456FF", "#FF7A45"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: 24,
                  padding: 22,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Pill label="Today" tone="primary" style={{ backgroundColor: "rgba(255,255,255,0.25)" }} />
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontFamily: "Inter_700Bold",
                        fontSize: 28,
                        marginTop: 12,
                        lineHeight: 32,
                      }}
                    >
                      {freeMinutesRemaining} min{"\n"}left to talk
                    </Text>
                    <Text
                      style={{
                        color: "#FFFFFF",
                        opacity: 0.92,
                        fontFamily: "Inter_400Regular",
                        fontSize: 13,
                        marginTop: 8,
                      }}
                    >
                      Tap to start a free practice call
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: "rgba(255,255,255,0.2)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather name="mic" size={26} color="#FFFFFF" />
                  </View>
                </View>
                <View style={{ marginTop: 18 }}>
                  <ProgressBar
                    value={usedPct}
                    height={6}
                    color="#FFFFFF"
                    trackColor="rgba(255,255,255,0.25)"
                  />
                </View>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Quick actions */}
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginTop: 16,
            }}
          >
            <QuickAction
              icon="zap"
              label="Daily Tasks"
              color="#FF7A45"
              onPress={() => router.push("/tasks")}
            />
            <QuickAction
              icon="users"
              label="Find Mentor"
              color="#16A085"
              onPress={() => router.push("/(tabs)/mentors")}
            />
            <QuickAction
              icon="book"
              label="Lessons"
              color="#5B3DFF"
              onPress={() => router.push("/(tabs)/learn")}
            />
            <QuickAction
              icon="gift"
              label="Wallet"
              color="#F5A524"
              onPress={() => router.push("/(tabs)/wallet")}
            />
          </View>
        </View>

        {/* AI Coach card */}
        <View style={{ paddingHorizontal: 20 }}>
          <SectionHeader title="Your AI coach" />
          <Card>
            <View style={{ flexDirection: "row", gap: 14 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  backgroundColor: "#EAE2FF",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="cpu" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 15,
                    color: colors.foreground,
                  }}
                >
                  Quick warm-up before your call
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
                  Try reading aloud: "I am learning English and I want to speak
                  with confidence."
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Daily Tasks */}
        <View style={{ paddingHorizontal: 20 }}>
          <SectionHeader
            title="Today's tasks"
            action={{ label: "See all", onPress: () => router.push("/tasks") }}
          />
          <View style={{ gap: 10 }}>
            {undoneTasks.length === 0 ? (
              <Card>
                <View style={{ alignItems: "center", paddingVertical: 12 }}>
                  <Feather name="check-circle" size={28} color={colors.success} />
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 14,
                      color: colors.foreground,
                      marginTop: 8,
                    }}
                  >
                    All done for today!
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 12,
                      color: colors.mutedForeground,
                      marginTop: 4,
                    }}
                  >
                    Come back tomorrow for new challenges.
                  </Text>
                </View>
              </Card>
            ) : (
              undoneTasks.map((t) => (
                <Pressable key={t.id} onPress={() => router.push("/tasks")}>
                  <Card>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: "#FFE9DD",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Feather name="target" size={18} color="#FF7A45" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 14,
                            color: colors.foreground,
                          }}
                        >
                          {t.title}
                        </Text>
                        <Text
                          style={{
                            fontFamily: "Inter_400Regular",
                            fontSize: 12,
                            color: colors.mutedForeground,
                            marginTop: 2,
                          }}
                        >
                          {t.minutes} min
                        </Text>
                      </View>
                      <CoinBadge amount={t.reward} size="sm" />
                    </View>
                  </Card>
                </Pressable>
              ))
            )}
          </View>
        </View>

        {/* Lessons */}
        <View style={{ paddingHorizontal: 20 }}>
          <SectionHeader
            title="Recommended lessons"
            action={{ label: "Browse", onPress: () => router.push("/(tabs)/learn") }}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 8 }}
          >
            {recommendedLessons.map((l) => {
              const done = state.completedLessons.includes(l.id);
              return (
                <Pressable
                  key={l.id}
                  onPress={() => router.push(`/lesson/${l.id}`)}
                  style={{ width: 200 }}
                >
                  <Card>
                    <View style={{ height: 72, justifyContent: "space-between" }}>
                      <Pill
                        label={l.level}
                        tone={l.level === "Beginner" ? "primary" : l.level === "Intermediate" ? "accent" : "warning"}
                      />
                      <Text
                        style={{
                          fontFamily: "Inter_700Bold",
                          fontSize: 15,
                          color: colors.foreground,
                          marginTop: 8,
                        }}
                        numberOfLines={2}
                      >
                        {l.title}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 10,
                        gap: 8,
                      }}
                    >
                      <Feather name="clock" size={12} color={colors.mutedForeground} />
                      <Text
                        style={{
                          fontFamily: "Inter_500Medium",
                          fontSize: 12,
                          color: colors.mutedForeground,
                        }}
                      >
                        {l.minutes} min
                      </Text>
                      {done ? (
                        <View style={{ marginLeft: "auto" }}>
                          <Feather
                            name="check-circle"
                            size={14}
                            color={colors.success}
                          />
                        </View>
                      ) : null}
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Mentors */}
        <View style={{ paddingHorizontal: 20 }}>
          <SectionHeader
            title="Mentors online now"
            action={{ label: "See all", onPress: () => router.push("/(tabs)/mentors") }}
          />
          <View style={{ gap: 10 }}>
            {onlineMentors.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => router.push(`/mentor/${m.id}`)}
              >
                <Card>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <Avatar
                      initials={m.initials}
                      size={48}
                      color={m.accentColor}
                      online
                    />
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter_700Bold",
                            fontSize: 15,
                            color: colors.foreground,
                          }}
                        >
                          {m.name}
                        </Text>
                        <Text style={{ fontSize: 11 }}>·</Text>
                        <Text
                          style={{
                            fontFamily: "Inter_500Medium",
                            fontSize: 12,
                            color: colors.mutedForeground,
                          }}
                        >
                          {m.region.split(",")[0]}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 4,
                        }}
                      >
                        <Feather name="star" size={12} color="#F5A524" />
                        <Text
                          style={{
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 12,
                            color: colors.foreground,
                          }}
                        >
                          {m.rating.toFixed(1)}
                        </Text>
                        <Text
                          style={{
                            fontFamily: "Inter_400Regular",
                            fontSize: 12,
                            color: colors.mutedForeground,
                          }}
                        >
                          ({m.sessions})
                        </Text>
                      </View>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        backgroundColor: colors.primary,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 999,
                      }}
                    >
                      <Feather name="phone" size={12} color="#FFFFFF" />
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 12,
                        }}
                      >
                        Call
                      </Text>
                    </View>
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Progress preview */}
        <View style={{ paddingHorizontal: 20 }}>
          <SectionHeader title="Your progress" />
          <Card>
            <ProgressRow label="Fluency" value={state.fluency} color={colors.primary} />
            <View style={{ height: 14 }} />
            <ProgressRow label="Pronunciation" value={state.pronunciation} color={colors.accent} />
            <View style={{ height: 14 }} />
            <ProgressRow label="Confidence" value={state.confidence} color={colors.success} />
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  color: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <View
        style={{
          alignItems: "center",
          backgroundColor: colors.card,
          borderRadius: 18,
          paddingVertical: 14,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 8,
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: color + "22",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name={icon} size={18} color={color} />
        </View>
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 11,
            color: colors.foreground,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function ProgressRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const colors = useColors();
  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 13,
            color: colors.foreground,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 13,
            color: colors.mutedForeground,
          }}
        >
          {value}%
        </Text>
      </View>
      <ProgressBar value={value} color={color} />
    </View>
  );
}

void StyleSheet;
