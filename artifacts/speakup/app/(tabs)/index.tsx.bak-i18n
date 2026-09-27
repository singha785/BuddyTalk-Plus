import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
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

import { Avatar } from "@/components/Avatar";
import { Card } from "@/components/Card";
import { CoinBadge } from "@/components/CoinBadge";
import { Pill } from "@/components/Pill";
import { Pressable } from "@/components/Pressable";
import { ProgressBar } from "@/components/ProgressBar";
import { CONSTANTS, useApp } from "@/context/AppContext";
import { useSocket } from "@/context/SocketContext";
import { LESSONS } from "@/data/lessons";
import { MENTORS } from "@/data/mentors";
import { getPresence, statusColor } from "@/data/presence";
import { DAILY_TASKS } from "@/data/tasks";
import { useColors } from "@/hooks/useColors";
import { usePresenceTick } from "@/hooks/usePresenceTick";

export default function Home() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, freeMinutesRemaining } = useApp();
  const { userOnline, setUserOnlineStatus } = useSocket();
  const now = usePresenceTick();

  const firstName = state.profile.name?.split(" ")[0] || "Friend";
  const totalAllowed = state.premium
    ? CONSTANTS.FREE_DAILY_MINUTES + 20
    : CONSTANTS.FREE_DAILY_MINUTES;
  const usedPct = Math.min(
    100,
    ((totalAllowed - freeMinutesRemaining) / totalAllowed) * 100,
  );

  const undoneTasks = DAILY_TASKS.filter(
    (t) => !state.completedTasks.includes(t.id),
  ).slice(0, 3);

  const recommendedLessons = LESSONS.filter(
    (l) => l.level === state.profile.level || state.profile.level === null,
  ).slice(0, 4);

  const liveMentors = useMemo(
    () =>
      MENTORS.map((m) => ({ mentor: m, presence: getPresence(m.id, m.online, now) }))
        .filter((x) => x.presence.isLive)
        .slice(0, 6),
    [now],
  );

  const weekAgoTs = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyCallCount = useMemo(
    () => state.callHistory.filter((c) => new Date(c.date).getTime() >= weekAgoTs).length,
    [state.callHistory, weekAgoTs],
  );
  const weeklyMins = useMemo(
    () =>
      state.callHistory
        .filter((c) => new Date(c.date).getTime() >= weekAgoTs)
        .reduce((sum, c) => sum + c.durationMinutes, 0),
    [state.callHistory, weekAgoTs],
  );
  const hasActivity = state.totalCalls > 0 || state.completedLessons.length > 0;

  const greeting = (() => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
  })();

  // Pulse animation for the LIVE dot
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.4],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 0],
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Decorative background orbs */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -120,
          right: -80,
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: "#5B3DFF",
          opacity: 0.12,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 120,
          left: -100,
          width: 240,
          height: 240,
          borderRadius: 120,
          backgroundColor: "#FF7A45",
          opacity: 0.1,
        }}
      />

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
              <View
                style={{
                  borderRadius: 24,
                  padding: 2,
                  backgroundColor: "#FFFFFF",
                  shadowColor: "#5B3DFF",
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 4,
                }}
              >
                <LinearGradient
                  colors={["#5B3DFF", "#FF7A45"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontFamily: "Inter_700Bold",
                      fontSize: 17,
                    }}
                  >
                    {(firstName[0] || "S").toUpperCase()}
                  </Text>
                </LinearGradient>
              </View>
              <View>
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 12,
                    color: colors.mutedForeground,
                  }}
                >
                  {greeting} 👋
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 19,
                    color: colors.foreground,
                    marginTop: 1,
                  }}
                >
                  {firstName}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              {/* Online / offline toggle */}
              <RNPressable
                onPress={() => setUserOnlineStatus(!userOnline)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  backgroundColor: userOnline ? "#DDF5EE" : "#F0F0F0",
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  borderRadius: 999,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 3.5,
                    backgroundColor: userOnline ? "#16A085" : "#999999",
                  }}
                />
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 11,
                    color: userOnline ? "#0E6F5A" : "#666666",
                    letterSpacing: 0.3,
                  }}
                >
                  {userOnline ? "Online" : "Offline"}
                </Text>
              </RNPressable>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  backgroundColor: "#FFE9DD",
                  paddingHorizontal: 10,
                  paddingVertical: 7,
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

          {/* HERO — Talk now */}
          <View style={{ marginTop: 22 }}>
            <Pressable onPress={() => router.push("/practice")}>
              <View
                style={{
                  borderRadius: 28,
                  overflow: "hidden",
                  shadowColor: "#5B3DFF",
                  shadowOpacity: 0.35,
                  shadowRadius: 24,
                  shadowOffset: { width: 0, height: 12 },
                  elevation: 8,
                }}
              >
                <LinearGradient
                  colors={["#3A1F9E", "#5B3DFF", "#FF7A45"]}
                  start={{ x: 0.0, y: 0.0 }}
                  end={{ x: 1.0, y: 1.0 }}
                  style={{
                    padding: 22,
                    paddingTop: 22,
                  }}
                >
                  {/* Decorative inner orbs */}
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      top: -40,
                      right: -40,
                      width: 180,
                      height: 180,
                      borderRadius: 90,
                      backgroundColor: "#FFFFFF",
                      opacity: 0.08,
                    }}
                  />
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      bottom: -50,
                      left: -30,
                      width: 140,
                      height: 140,
                      borderRadius: 70,
                      backgroundColor: "#FFFFFF",
                      opacity: 0.06,
                    }}
                  />

                  {/* Live row */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <View style={{ width: 10, height: 10, justifyContent: "center", alignItems: "center" }}>
                      <Animated.View
                        style={{
                          position: "absolute",
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: "#9CFCB8",
                          transform: [{ scale: pulseScale }],
                          opacity: pulseOpacity,
                        }}
                      />
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: "#34D27D",
                        }}
                      />
                    </View>
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontFamily: "Inter_700Bold",
                        fontSize: 12,
                        letterSpacing: 0.6,
                      }}
                    >
                      {liveMentors.length > 0
                        ? `${liveMentors.length} BUDDIES LIVE NOW`
                        : "WARMING UP THE LINE"}
                    </Text>
                  </View>

                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontFamily: "Inter_700Bold",
                      fontSize: 32,
                      marginTop: 14,
                      lineHeight: 36,
                      letterSpacing: -0.5,
                    }}
                  >
                    Speak English.{"\n"}Earn confidence.
                  </Text>
                  <Text
                    style={{
                      color: "#FFFFFF",
                      opacity: 0.88,
                      fontFamily: "Inter_400Regular",
                      fontSize: 13,
                      marginTop: 8,
                      lineHeight: 18,
                    }}
                  >
                    {freeMinutesRemaining} free minutes left today · Tap to start a live call
                  </Text>

                  {/* Big call button */}
                  <View
                    style={{
                      marginTop: 22,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: 999,
                        paddingHorizontal: 18,
                        paddingVertical: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        shadowColor: "#000",
                        shadowOpacity: 0.15,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 6 },
                      }}
                    >
                      <View
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: "#34D27D",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Feather name="phone-call" size={13} color="#FFFFFF" />
                      </View>
                      <Text
                        style={{
                          color: "#1A1530",
                          fontFamily: "Inter_700Bold",
                          fontSize: 15,
                        }}
                      >
                        Start a free call
                      </Text>
                    </View>
                    {/* Live mentor avatars */}
                    {liveMentors.length > 0 ? (
                      <View
                        style={{
                          flexDirection: "row",
                          marginLeft: 4,
                        }}
                      >
                        {liveMentors.slice(0, 3).map((lm, idx) => (
                          <View
                            key={lm.mentor.id}
                            style={{
                              marginLeft: idx === 0 ? 0 : -10,
                              borderWidth: 2,
                              borderColor: "#FFFFFF",
                              borderRadius: 999,
                            }}
                          >
                            <Avatar
                              initials={lm.mentor.initials}
                              size={28}
                              color={lm.mentor.accentColor}
                            />
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>

                  {/* Progress bar */}
                  <View style={{ marginTop: 22 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <Text
                        style={{
                          color: "#FFFFFF",
                          opacity: 0.85,
                          fontFamily: "Inter_500Medium",
                          fontSize: 11,
                          letterSpacing: 0.4,
                        }}
                      >
                        TODAY'S TALK TIME
                      </Text>
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontFamily: "Inter_700Bold",
                          fontSize: 11,
                        }}
                      >
                        {totalAllowed - freeMinutesRemaining}/{totalAllowed} min
                      </Text>
                    </View>
                    <ProgressBar
                      value={usedPct}
                      height={6}
                      color="#FFFFFF"
                      trackColor="rgba(255,255,255,0.22)"
                    />
                  </View>
                </LinearGradient>
              </View>
            </Pressable>
          </View>

          {/* Quick actions — gradient tiles */}
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginTop: 18,
            }}
          >
            <QuickAction
              icon="zap"
              label="Tasks"
              gradient={["#FFB47A", "#FF7A45"]}
              onPress={() => router.push("/tasks")}
            />
            <QuickAction
              icon="users"
              label="Mentors"
              gradient={["#3FE1B0", "#0E9F7A"]}
              onPress={() => router.push("/(tabs)/mentors")}
            />
            <QuickAction
              icon="book-open"
              label="Lessons"
              gradient={["#7E62FF", "#4A2BE0"]}
              onPress={() => router.push("/(tabs)/learn")}
            />
            <QuickAction
              icon="gift"
              label="Wallet"
              gradient={["#FFD66B", "#E59611"]}
              onPress={() => router.push("/(tabs)/wallet")}
            />
          </View>

          {/* Live mentors strip */}
          {liveMentors.length > 0 ? (
            <View style={{ marginTop: 26 }}>
              <SectionHeaderRow
                title="Live mentors right now"
                badge={`${liveMentors.length}`}
                actionLabel="See all"
                onAction={() => router.push("/(tabs)/mentors")}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingRight: 8, marginTop: 12 }}
              >
                {liveMentors.map(({ mentor: m, presence }) => (
                  <Pressable
                    key={m.id}
                    onPress={() => router.push(`/mentor/${m.id}`)}
                    style={{ width: 168 }}
                  >
                    <View
                      style={{
                        backgroundColor: colors.card,
                        borderRadius: 22,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: colors.border,
                        shadowColor: "#1A1530",
                        shadowOpacity: 0.05,
                        shadowRadius: 14,
                        shadowOffset: { width: 0, height: 6 },
                        elevation: 1,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Avatar
                          initials={m.initials}
                          size={48}
                          color={m.accentColor}
                          status={presence.status}
                        />
                        <View
                          style={{
                            backgroundColor: "#DDF5EE",
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 999,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <View
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: "#16A085",
                            }}
                          />
                          <Text
                            style={{
                              fontFamily: "Inter_700Bold",
                              fontSize: 10,
                              color: "#0E6F5A",
                              letterSpacing: 0.5,
                            }}
                          >
                            LIVE
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={{
                          fontFamily: "Inter_700Bold",
                          fontSize: 14,
                          color: colors.foreground,
                          marginTop: 12,
                        }}
                        numberOfLines={1}
                      >
                        {m.name}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          fontSize: 11,
                          color: colors.mutedForeground,
                          marginTop: 2,
                        }}
                        numberOfLines={1}
                      >
                        {m.region.split(",")[0]}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginTop: 12,
                          justifyContent: "space-between",
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <Feather name="star" size={11} color="#F5A524" />
                          <Text
                            style={{
                              fontFamily: "Inter_700Bold",
                              fontSize: 11,
                              color: colors.foreground,
                            }}
                          >
                            {m.rating.toFixed(1)}
                          </Text>
                        </View>
                        <CoinBadge amount={m.pricePer10Min} size="sm" />
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Daily mission */}
          <View style={{ marginTop: 26 }}>
            <SectionHeaderRow
              title="Today's missions"
              actionLabel="See all"
              onAction={() => router.push("/tasks")}
            />
            <View style={{ gap: 10, marginTop: 12 }}>
              {undoneTasks.length === 0 ? (
                <Card>
                  <View style={{ alignItems: "center", paddingVertical: 12 }}>
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: "#DDF5EE",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather name="check-circle" size={28} color="#0E6F5A" />
                    </View>
                    <Text
                      style={{
                        fontFamily: "Inter_700Bold",
                        fontSize: 15,
                        color: colors.foreground,
                        marginTop: 12,
                      }}
                    >
                      All missions done!
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 12,
                        color: colors.mutedForeground,
                        marginTop: 4,
                        textAlign: "center",
                      }}
                    >
                      Come back tomorrow for new ones — your streak is safe.
                    </Text>
                  </View>
                </Card>
              ) : (
                undoneTasks.map((t, idx) => (
                  <Pressable key={t.id} onPress={() => router.push("/tasks")}>
                    <Card>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 14,
                        }}
                      >
                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 14,
                            overflow: "hidden",
                          }}
                        >
                          <LinearGradient
                            colors={
                              idx % 3 === 0
                                ? ["#FFB47A", "#FF7A45"]
                                : idx % 3 === 1
                                  ? ["#7E62FF", "#4A2BE0"]
                                  : ["#3FE1B0", "#0E9F7A"]
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                              flex: 1,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Feather name="target" size={20} color="#FFFFFF" />
                          </LinearGradient>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontFamily: "Inter_700Bold",
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
                              marginTop: 3,
                            }}
                          >
                            {t.minutes} min · earn coins
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

          {/* AI Coach */}
          <View style={{ marginTop: 26 }}>
            <SectionHeaderRow title="Your AI coach" />
            <View style={{ marginTop: 12 }}>
              <View
                style={{
                  borderRadius: 22,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <LinearGradient
                  colors={["#F4EFFF", "#FFFFFF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ padding: 18 }}
                >
                  <View style={{ flexDirection: "row", gap: 14 }}>
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 16,
                        overflow: "hidden",
                      }}
                    >
                      <LinearGradient
                        colors={["#7E62FF", "#3A1F9E"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          flex: 1,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Feather name="cpu" size={22} color="#FFFFFF" />
                      </LinearGradient>
                    </View>
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
                            fontSize: 14,
                            color: colors.foreground,
                          }}
                        >
                          Quick warm-up
                        </Text>
                        <Pill label="30s" tone="primary" />
                      </View>
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          fontSize: 13,
                          color: colors.mutedForeground,
                          marginTop: 6,
                          lineHeight: 18,
                          fontStyle: "italic",
                        }}
                      >
                        "I am learning English and I want to speak with confidence."
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </View>
          </View>

          {/* Lessons */}
          <View style={{ marginTop: 26 }}>
            <SectionHeaderRow
              title="Recommended lessons"
              actionLabel="Browse"
              onAction={() => router.push("/(tabs)/learn")}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 8, marginTop: 12 }}
            >
              {recommendedLessons.map((l, idx) => {
                const done = state.completedLessons.includes(l.id);
                const grads: [string, string][] = [
                  ["#5B3DFF", "#7E62FF"],
                  ["#FF7A45", "#FFB47A"],
                  ["#0E9F7A", "#3FE1B0"],
                  ["#E59611", "#FFD66B"],
                ];
                const grad = grads[idx % grads.length];
                return (
                  <Pressable
                    key={l.id}
                    onPress={() => router.push(`/lesson/${l.id}`)}
                    style={{ width: 220 }}
                  >
                    <View
                      style={{
                        borderRadius: 22,
                        overflow: "hidden",
                        backgroundColor: colors.card,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <LinearGradient
                        colors={grad}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          height: 84,
                          padding: 14,
                          justifyContent: "space-between",
                        }}
                      >
                        <Pill
                          label={l.level}
                          style={{ backgroundColor: "rgba(255,255,255,0.28)" }}
                        />
                        <Feather
                          name={done ? "check-circle" : "play-circle"}
                          size={22}
                          color="#FFFFFF"
                          style={{ alignSelf: "flex-end" }}
                        />
                      </LinearGradient>
                      <View style={{ padding: 14 }}>
                        <Text
                          style={{
                            fontFamily: "Inter_700Bold",
                            fontSize: 14,
                            color: colors.foreground,
                            lineHeight: 18,
                          }}
                          numberOfLines={2}
                        >
                          {l.title}
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginTop: 10,
                            gap: 6,
                          }}
                        >
                          <Feather
                            name="clock"
                            size={11}
                            color={colors.mutedForeground}
                          />
                          <Text
                            style={{
                              fontFamily: "Inter_500Medium",
                              fontSize: 11,
                              color: colors.mutedForeground,
                            }}
                          >
                            {l.minutes} min
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Growth */}
          <View style={{ marginTop: 26 }}>
            <SectionHeaderRow title="Your growth" />

            {/* Real stats row */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <GrowthTile
                icon="phone"
                value={state.totalCalls}
                label="Calls"
                colors={colors}
              />
              <GrowthTile
                icon="clock"
                value={state.totalMinutesSpoken}
                label="Mins"
                colors={colors}
              />
              <GrowthTile
                icon="book-open"
                value={state.completedLessons.length}
                label="Lessons"
                colors={colors}
              />
            </View>

            {/* Weekly activity */}
            {weeklyCallCount > 0 ? (
              <View style={{ marginTop: 10 }}>
                <Card>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: colors.primary + "1A",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather name="bar-chart-2" size={16} color={colors.primary} />
                    </View>
                    <View>
                      <Text
                        style={{
                          fontFamily: "Inter_700Bold",
                          fontSize: 13,
                          color: colors.foreground,
                        }}
                      >
                        This week
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          fontSize: 12,
                          color: colors.mutedForeground,
                          marginTop: 2,
                        }}
                      >
                        {weeklyCallCount} call{weeklyCallCount !== 1 ? "s" : ""} · {weeklyMins} min{weeklyMins !== 1 ? "s" : ""} spoken
                      </Text>
                    </View>
                    {state.streak > 0 ? (
                      <View
                        style={{
                          marginLeft: "auto",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          backgroundColor: "#FFF3E0",
                          borderRadius: 10,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                        }}
                      >
                        <Text style={{ fontSize: 14 }}>🔥</Text>
                        <Text
                          style={{
                            fontFamily: "Inter_700Bold",
                            fontSize: 13,
                            color: "#E65100",
                          }}
                        >
                          {state.streak}d
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </Card>
              </View>
            ) : null}

            {/* Skill bars */}
            <View style={{ marginTop: 10 }}>
              <Card>
                {!hasActivity ? (
                  <View style={{ alignItems: "center", paddingVertical: 8 }}>
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 14,
                        color: colors.foreground,
                        textAlign: "center",
                      }}
                    >
                      No data yet
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 13,
                        color: colors.mutedForeground,
                        marginTop: 4,
                        textAlign: "center",
                        lineHeight: 19,
                      }}
                    >
                      Complete a practice call or lesson to start tracking your fluency, pronunciation, and confidence.
                    </Text>
                  </View>
                ) : (
                  <>
                    <ProgressRow
                      label="Fluency"
                      emoji="🗣️"
                      value={state.fluency}
                      color={colors.primary}
                    />
                    <View style={{ height: 16 }} />
                    <ProgressRow
                      label="Pronunciation"
                      emoji="🎯"
                      value={state.pronunciation}
                      color={colors.accent}
                    />
                    <View style={{ height: 16 }} />
                    <ProgressRow
                      label="Confidence"
                      emoji="💪"
                      value={state.confidence}
                      color="#0E9F7A"
                    />
                  </>
                )}
              </Card>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionHeaderRow({
  title,
  badge,
  actionLabel,
  onAction,
}: {
  title: string;
  badge?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 18,
            color: colors.foreground,
            letterSpacing: -0.3,
          }}
        >
          {title}
        </Text>
        {badge ? (
          <View
            style={{
              backgroundColor: "#DDF5EE",
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 11,
                color: "#0E6F5A",
              }}
            >
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction}>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 13,
              color: colors.primary,
            }}
          >
            {actionLabel} →
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function QuickAction({
  icon,
  label,
  gradient,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  gradient: [string, string];
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
          gap: 10,
          shadowColor: "#1A1530",
          shadowOpacity: 0.05,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 1,
        }}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name={icon} size={20} color="#FFFFFF" />
          </LinearGradient>
        </View>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 11,
            color: colors.foreground,
            letterSpacing: 0.2,
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
  emoji,
  value,
  color,
}: {
  label: string;
  emoji: string;
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
          marginBottom: 8,
          alignItems: "center",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 16 }}>{emoji}</Text>
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 14,
              color: colors.foreground,
            }}
          >
            {label}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 13,
            color,
          }}
        >
          {value}%
        </Text>
      </View>
      <ProgressBar value={value} color={color} height={8} />
    </View>
  );
}

function GrowthTile({
  icon,
  value,
  label,
  colors,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  value: number;
  label: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 8,
        gap: 6,
      }}
    >
      <Feather name={icon} size={18} color={colors.primary} />
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          fontSize: 22,
          color: colors.foreground,
          lineHeight: 26,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: "Inter_500Medium",
          fontSize: 11,
          color: colors.mutedForeground,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
