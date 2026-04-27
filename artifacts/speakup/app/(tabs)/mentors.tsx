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
import { getPresence, statusColor } from "@/data/presence";
import { useColors } from "@/hooks/useColors";
import { usePresenceTick } from "@/hooks/usePresenceTick";

const TABS = [
  { id: "live", label: "Live now" },
  { id: "all", label: "All" },
  { id: "Pro Mentor", label: "Pro" },
  { id: "Mentor", label: "Mentor" },
  { id: "Helper", label: "Helper" },
] as const;

export default function MentorsTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const now = usePresenceTick();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("live");

  const enriched = useMemo(
    () =>
      MENTORS.map((m) => ({
        mentor: m,
        presence: getPresence(m.id, m.online, now),
      })),
    [now],
  );

  const liveCount = enriched.filter((e) => e.presence.isLive).length;

  const list = useMemo(() => {
    let rows = enriched;
    if (tab === "live") rows = enriched.filter((e) => e.presence.isLive);
    else if (tab !== "all")
      rows = enriched.filter((e) => e.mentor.level === tab);
    return [...rows].sort((a, b) => {
      const order: Record<string, number> = {
        live: 0,
        "in-call": 1,
        away: 2,
        offline: 3,
      };
      return order[a.presence.status] - order[b.presence.status];
    });
  }, [enriched, tab]);

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
          Real people, available to talk right now.
        </Text>

        {/* Live banner */}
        <View style={{ marginTop: 16 }}>
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: liveCount > 0 ? "#DDF5EE" : colors.muted,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: liveCount > 0 ? "#16A085" : "#9CA3AF",
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 15,
                    color: colors.foreground,
                  }}
                >
                  {liveCount > 0
                    ? `${liveCount} mentor${liveCount === 1 ? "" : "s"} live now`
                    : "No mentors live right now"}
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                    color: colors.mutedForeground,
                    marginTop: 2,
                  }}
                >
                  {liveCount > 0
                    ? "Tap a green-dot mentor to call instantly."
                    : "Try again in a few minutes — presence updates every 30s."}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        <Pressable
          onPress={() => router.push("/become-mentor")}
          style={{ marginTop: 12 }}
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
                  backgroundColor: "#FFE9DD",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="award" size={22} color="#A93D00" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 15,
                    color: colors.foreground,
                  }}
                >
                  Become a live mentor
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 13,
                    color: colors.mutedForeground,
                    marginTop: 2,
                  }}
                >
                  Pass a quick test, go live, earn coins
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
            const isLiveTab = t.id === "live";
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
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {isLiveTab ? (
                    <View
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 3.5,
                        backgroundColor: active ? "#FFFFFF" : "#16A085",
                      }}
                    />
                  ) : null}
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 13,
                      color: active ? "#FFFFFF" : colors.foreground,
                    }}
                  >
                    {t.label}
                    {isLiveTab && liveCount > 0 ? ` (${liveCount})` : ""}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {list.length === 0 ? (
          <Card>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
                color: colors.foreground,
                textAlign: "center",
              }}
            >
              No mentors here right now
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: colors.mutedForeground,
                marginTop: 6,
                textAlign: "center",
              }}
            >
              Try the "All" tab to see who's coming back soon.
            </Text>
          </Card>
        ) : null}

        <View style={{ gap: 12 }}>
          {list.map(({ mentor: m, presence }) => (
            <Pressable key={m.id} onPress={() => router.push(`/mentor/${m.id}`)}>
              <Card>
                <View style={{ flexDirection: "row", gap: 14 }}>
                  <Avatar
                    initials={m.initials}
                    size={56}
                    color={m.accentColor}
                    status={presence.status}
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

                    {/* Live status row */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 6,
                      }}
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: statusColor(presence.status),
                        }}
                      />
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 12,
                          color: statusColor(presence.status),
                        }}
                      >
                        {presence.label}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 6,
                      }}
                    >
                      <Feather
                        name="map-pin"
                        size={11}
                        color={colors.mutedForeground}
                      />
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
