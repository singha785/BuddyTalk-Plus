import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
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
import { useSocket, type PresenceStatus } from "@/context/SocketContext";
import { getPresence, statusColor } from "@/data/presence";
import { useColors } from "@/hooks/useColors";
import type { MentorProfile } from "@workspace/api-client-react";

const TABS = [
  { id: "live", label: "Live now" },
  { id: "all", label: "All" },
  { id: "Pro Mentor", label: "Pro" },
  { id: "Mentor", label: "Mentor" },
  { id: "Helper", label: "Helper" },
] as const;

const STATUS_ORDER: Record<string, number> = {
  live: 0,
  "in-call": 1,
  away: 2,
  offline: 3,
};

type MentorPresence = ReturnType<typeof getPresence>;

function resolvePresence(
  mentor: MentorProfile,
  socketStatus: PresenceStatus | undefined,
  now: number,
): MentorPresence {
  if (socketStatus) {
    const status = socketStatus;
    const label =
      status === "live"
        ? "Live now"
        : status === "in-call"
          ? "In a call"
          : status === "away"
            ? "Away"
            : "Offline";
    return {
      status,
      label,
      shortLabel: label,
      etaMinutes: 0,
      isLive: status === "live",
      callable: status === "live",
    };
  }
  // Fall back to deterministic simulation for mentors not connected via socket
  return getPresence(mentor.id, true, now);
}

export default function MentorsTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const socket = useSocket();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("live");
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // Refresh simulated presence every 30s for offline mentors
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Fetch mentors from API
  useEffect(() => {
    let cancelled = false;
    const fetchMentors = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/mentors");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as MentorProfile[];
        if (!cancelled) {
          setMentors(data);
          setFetchError(null);
        }
      } catch (e) {
        if (!cancelled) setFetchError("Could not load mentors.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchMentors();
    return () => { cancelled = true; };
  }, []);

  const enriched = useMemo(
    () =>
      mentors.map((m) => ({
        mentor: m,
        presence: resolvePresence(
          m,
          socket.presenceMap[m.id] as PresenceStatus | undefined,
          now,
        ),
      })),
    [mentors, socket.presenceMap, now],
  );

  const liveCount = enriched.filter((e) => e.presence.isLive).length;

  const list = useMemo(() => {
    let rows = enriched;
    if (tab === "live") rows = enriched.filter((e) => e.presence.isLive);
    else if (tab !== "all")
      rows = enriched.filter((e) => e.mentor.mentorLevel === tab);
    return [...rows].sort(
      (a, b) =>
        (STATUS_ORDER[a.presence.status] ?? 3) -
        (STATUS_ORDER[b.presence.status] ?? 3),
    );
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
          AI practice partners — available any time to help you improve.
        </Text>

        {/* Live banner */}
        <View style={{ marginTop: 16 }}>
          <Card>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
            >
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
                  {loading
                    ? "Loading mentors…"
                    : liveCount > 0
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
                  {socket.connected
                    ? "Live presence is real-time via socket."
                    : "Connecting for live presence…"}
                </Text>
              </View>
              {socket.connected ? (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "#16A085",
                  }}
                />
              ) : (
                <ActivityIndicator size="small" color={colors.mutedForeground} />
              )}
            </View>
          </Card>
        </View>

        <Pressable
          onPress={() => router.push("/become-mentor")}
          style={{ marginTop: 12 }}
        >
          <Card>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
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

        {/* Tab filter */}
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

        {/* Error state */}
        {fetchError ? (
          <Card>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
                color: "#B0181F",
                textAlign: "center",
              }}
            >
              {fetchError}
            </Text>
          </Card>
        ) : null}

        {/* Loading skeleton */}
        {loading ? (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                color: colors.mutedForeground,
                marginTop: 12,
              }}
            >
              Loading mentors from server…
            </Text>
          </View>
        ) : null}

        {/* Empty state */}
        {!loading && list.length === 0 ? (
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
              Try the "All" tab to see everyone.
            </Text>
          </Card>
        ) : null}

        {/* Mentor list */}
        <View style={{ gap: 12 }}>
          {list.map(({ mentor: m, presence }) => (
            <Pressable
              key={m.id}
              onPress={() => router.push(`/mentor/${m.id}`)}
            >
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
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text
                          style={{
                            fontFamily: "Inter_700Bold",
                            fontSize: 16,
                            color: colors.foreground,
                          }}
                        >
                          {m.name}
                        </Text>
                        <View
                          style={{
                            backgroundColor: "#EDE9FE",
                            borderRadius: 6,
                            paddingHorizontal: 5,
                            paddingVertical: 2,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: "Inter_600SemiBold",
                              fontSize: 10,
                              color: "#5B3DFF",
                            }}
                          >
                            AI
                          </Text>
                        </View>
                      </View>
                      <Pill
                        label={m.mentorLevel}
                        tone={m.mentorLevel === "Pro Mentor" ? "primary" : "default"}
                      />
                    </View>
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
