import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { Pressable } from "@/components/Pressable";
import { useApp } from "@/context/AppContext";
import { LESSONS } from "@/data/lessons";
import { useColors } from "@/hooks/useColors";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "Beginner", label: "Beginner" },
  { id: "Intermediate", label: "Intermediate" },
  { id: "Advanced", label: "Advanced" },
] as const;

export default function LearnTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state } = useApp();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const lessons = useMemo(() => {
    if (filter === "all") return LESSONS;
    return LESSONS.filter((l) => l.level === filter);
  }, [filter]);

  const completedCount = state.completedLessons.length;
  const totalLessons = LESSONS.length;
  const progress = Math.round((completedCount / totalLessons) * 100);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 28,
            color: colors.foreground,
          }}
        >
          Lessons
        </Text>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            color: colors.mutedForeground,
            marginTop: 4,
          }}
        >
          Tap any lesson to listen and repeat aloud.
        </Text>

        <Card style={{ marginTop: 18 }}>
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
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 13,
                  color: colors.mutedForeground,
                }}
              >
                Your library
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 22,
                  color: colors.foreground,
                  marginTop: 4,
                }}
              >
                {completedCount} of {totalLessons} done
              </Text>
            </View>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontFamily: "Inter_700Bold",
                  fontSize: 18,
                }}
              >
                {progress}%
              </Text>
            </View>
          </View>
        </Card>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 16 }}
        >
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <Pressable key={f.id} onPress={() => setFilter(f.id)}>
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: 999,
                    backgroundColor: active ? colors.primary : colors.card,
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 13,
                      color: active ? "#FFFFFF" : colors.foreground,
                    }}
                  >
                    {f.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ gap: 10 }}>
          {lessons.map((l) => {
            const done = state.completedLessons.includes(l.id);
            return (
              <Pressable
                key={l.id}
                onPress={() => router.push(`/lesson/${l.id}`)}
              >
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
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        backgroundColor: categoryBg(l.category),
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather
                        name={categoryIcon(l.category)}
                        size={20}
                        color={categoryFg(l.category)}
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
                          {l.title}
                        </Text>
                        {done ? (
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
                        }}
                        numberOfLines={1}
                      >
                        {l.description}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 8,
                        }}
                      >
                        <Pill
                          label={l.level}
                          tone={
                            l.level === "Beginner"
                              ? "primary"
                              : l.level === "Intermediate"
                              ? "accent"
                              : "warning"
                          }
                        />
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
                            {l.minutes} min
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={20}
                      color={colors.mutedForeground}
                    />
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function categoryIcon(
  cat: string,
): React.ComponentProps<typeof Feather>["name"] {
  if (cat === "alphabet") return "type";
  if (cat === "phrase") return "message-square";
  if (cat === "grammar") return "book-open";
  return "coffee";
}

function categoryBg(cat: string): string {
  if (cat === "alphabet") return "#EAE2FF";
  if (cat === "phrase") return "#FFE9DD";
  if (cat === "grammar") return "#FFF1D6";
  return "#DDF5EE";
}

function categoryFg(cat: string): string {
  if (cat === "alphabet") return "#5B3DFF";
  if (cat === "phrase") return "#A93D00";
  if (cat === "grammar") return "#7A4A00";
  return "#0E6F5A";
}
