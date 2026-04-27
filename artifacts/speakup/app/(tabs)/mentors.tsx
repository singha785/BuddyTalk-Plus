import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { Card } from "@/components/Card";
import { CoinBadge } from "@/components/CoinBadge";
import { Pill } from "@/components/Pill";
import { Pressable } from "@/components/Pressable";
import { MENTORS } from "@/data/mentors";
import { useColors } from "@/hooks/useColors";

const TABS = [
  { id: "all", label: "All" },
  { id: "online", label: "Online now" },
  { id: "Pro Mentor", label: "Pro" },
  { id: "Mentor", label: "Mentor" },
  { id: "Helper", label: "Helper" },
] as const;

export default function MentorsTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");

  const list = useMemo(() => {
    if (tab === "all") return MENTORS;
    if (tab === "online") return MENTORS.filter((m) => m.online);
    return MENTORS.filter((m) => m.level === tab);
  }, [tab]);

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
          Mentors
        </Text>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            color: colors.mutedForeground,
            marginTop: 4,
          }}
        >
          Talk to a real mentor or help others to earn coins.
        </Text>

        <Pressable
          onPress={() => router.push("/become-mentor")}
          style={{ marginTop: 18 }}
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
                  backgroundColor: "#DDF5EE",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="award" size={22} color="#0E6F5A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 15,
                    color: colors.foreground,
                  }}
                >
                  Become a mentor
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 13,
                    color: colors.mutedForeground,
                    marginTop: 2,
                  }}
                >
                  Take a quick test and earn coins from sessions
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={colors.mutedForeground}
              />
            </View>
          </Card>
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 16 }}
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <Pressable key={t.id} onPress={() => setTab(t.id)}>
                <View
                  style={{
                    paddingHorizontal: 14,
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
                    {t.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ gap: 12 }}>
          {list.map((m) => (
            <Pressable key={m.id} onPress={() => router.push(`/mentor/${m.id}`)}>
              <Card>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 14,
                  }}
                >
                  <Avatar
                    initials={m.initials}
                    size={56}
                    color={m.accentColor}
                    online={m.online}
                  />
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter_700Bold",
                          fontSize: 16,
                          color: colors.foreground,
                        }}
                      >
                        {m.name}
                      </Text>
                      <Pill
                        label={m.level}
                        tone={m.level === "Pro Mentor" ? "primary" : "default"}
                      />
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 4,
                      }}
                    >
                      <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          fontSize: 12,
                          color: colors.mutedForeground,
                        }}
                      >
                        {m.region}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 13,
                        color: colors.mutedForeground,
                        marginTop: 8,
                        lineHeight: 18,
                      }}
                      numberOfLines={2}
                    >
                      {m.bio}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 12,
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Feather name="star" size={12} color="#F5A524" />
                        <Text
                          style={{
                            fontFamily: "Inter_700Bold",
                            fontSize: 13,
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
                      <View style={{ marginLeft: "auto" }}>
                        <CoinBadge amount={m.pricePer10Min} size="sm" />
                      </View>
                    </View>
                  </View>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
