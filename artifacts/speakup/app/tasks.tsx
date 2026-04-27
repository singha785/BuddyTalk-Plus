import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import React from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/Card";
import { CoinBadge } from "@/components/CoinBadge";
import { Pressable } from "@/components/Pressable";
import { ProgressBar } from "@/components/ProgressBar";
import { useApp } from "@/context/AppContext";
import { DAILY_TASKS, DailyTask } from "@/data/tasks";
import { useColors } from "@/hooks/useColors";

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

export default function TasksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, completeTask } = useApp();

  const total = DAILY_TASKS.length;
  const done = DAILY_TASKS.filter((t) =>
    state.completedTasks.includes(t.id),
  ).length;
  const pct = Math.round((done / total) * 100);

  const onComplete = async (t: DailyTask) => {
    await completeTask(t.id, t.reward);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => undefined,
    );
  };

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
        <ScrollView
          contentContainerStyle={{
            paddingTop: Platform.OS === "web" ? 24 : 16,
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Card>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View>
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 13,
                    color: colors.mutedForeground,
                  }}
                >
                  Today's progress
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 22,
                    color: colors.foreground,
                    marginTop: 6,
                  }}
                >
                  {done} / {total} done
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: "#FFF1D6",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 14,
                    color: "#7A4A00",
                  }}
                >
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
              return (
                <Card key={t.id}>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 14,
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 14,
                        backgroundColor: TYPE_BG[t.type],
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather
                        name={TYPE_ICONS[t.type]}
                        size={20}
                        color={TYPE_FG[t.type]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter_700Bold",
                            fontSize: 15,
                            color: colors.foreground,
                          }}
                        >
                          {t.title}
                        </Text>
                        {isDone ? (
                          <Feather
                            name="check-circle"
                            size={14}
                            color={colors.success}
                          />
                        ) : null}
                      </View>
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          fontSize: 13,
                          color: colors.mutedForeground,
                          marginTop: 4,
                          lineHeight: 18,
                        }}
                      >
                        {t.description}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                          marginTop: 10,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
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
                            {t.minutes} min
                          </Text>
                        </View>
                        <CoinBadge amount={t.reward} size="sm" />
                      </View>
                    </View>
                    {isDone ? (
                      <View
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 999,
                          backgroundColor: colors.muted,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 12,
                            color: colors.mutedForeground,
                          }}
                        >
                          Done
                        </Text>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => {
                          if (t.type === "talk") {
                            router.push("/practice");
                          } else {
                            onComplete(t);
                          }
                        }}
                      >
                        <View
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 9,
                            borderRadius: 999,
                            backgroundColor: colors.primary,
                          }}
                        >
                          <Text
                            style={{
                              color: "#FFFFFF",
                              fontFamily: "Inter_700Bold",
                              fontSize: 12,
                            }}
                          >
                            {t.type === "talk" ? "Start" : "Done"}
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
