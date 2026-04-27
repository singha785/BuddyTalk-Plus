import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CoinBadge } from "@/components/CoinBadge";
import { Pill } from "@/components/Pill";
import { Pressable } from "@/components/Pressable";
import { useApp } from "@/context/AppContext";
import { MENTORS } from "@/data/mentors";
import { useColors } from "@/hooks/useColors";
import { showAlert } from "@/utils/alert";

const SLOTS = ["10:00 AM", "12:30 PM", "3:00 PM", "5:30 PM", "8:00 PM"];

export default function MentorDetail() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const mentor = MENTORS.find((m) => m.id === id);
  const { state, spendCoins, recordCall } = useApp();
  const [slot, setSlot] = useState<string | null>(null);

  if (!mentor) {
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
          Mentor not found.
        </Text>
        <View style={{ marginTop: 12 }}>
          <Button label="Go back" variant="outline" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const handleHelpNow = async () => {
    if (state.coins < mentor.pricePer10Min) {
      showAlert(
        "Not enough coins",
        `You need ${mentor.pricePer10Min} coins for a 10-minute session.`,
        [
          { text: "OK", style: "cancel" },
          { text: "Earn coins", onPress: () => router.push("/(tabs)/wallet") },
        ],
      );
      return;
    }
    showAlert(
      "Start session?",
      `${mentor.pricePer10Min} coins will be charged for 10 minutes with ${mentor.name}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start",
          onPress: async () => {
            const ok = await spendCoins(mentor.pricePer10Min);
            if (ok) {
              await recordCall(10);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              ).catch(() => undefined);
              router.push("/practice");
            }
          },
        },
      ],
    );
  };

  const handleBook = async () => {
    if (!slot) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => undefined,
    );
    showAlert(
      "Booked!",
      `Your session with ${mentor.name} is confirmed for ${slot}. We'll notify you 5 minutes before.`,
    );
    setSlot(null);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          headerTransparent: true,
          headerTintColor: colors.foreground,
        }}
      />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 60,
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: "center" }}>
            <Avatar
              initials={mentor.initials}
              size={104}
              color={mentor.accentColor}
              online={mentor.online}
            />
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 24,
                color: colors.foreground,
                marginTop: 14,
              }}
            >
              {mentor.name}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: 6,
              }}
            >
              <Feather name="map-pin" size={12} color={colors.mutedForeground} />
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 13,
                  color: colors.mutedForeground,
                }}
              >
                {mentor.region}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginTop: 12,
              }}
            >
              <Pill
                label={mentor.level}
                tone={mentor.level === "Pro Mentor" ? "primary" : "default"}
              />
              {mentor.online ? <Pill label="Online" tone="success" /> : null}
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginTop: 24,
            }}
          >
            <StatCard
              icon="star"
              iconColor="#F5A524"
              label="Rating"
              value={mentor.rating.toFixed(1)}
            />
            <StatCard
              icon="users"
              iconColor={colors.primary}
              label="Sessions"
              value={mentor.sessions.toLocaleString()}
            />
            <StatCard
              icon="zap"
              iconColor="#A93D00"
              label="Per 10 min"
              value={mentor.pricePer10Min.toString()}
            />
          </View>

          <Text style={sectionHeader(colors)}>About</Text>
          <Card>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                color: colors.foreground,
                lineHeight: 22,
              }}
            >
              {mentor.bio}
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 14,
              }}
            >
              {mentor.specialties.map((s) => (
                <View
                  key={s}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    backgroundColor: colors.muted,
                    borderRadius: 999,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_500Medium",
                      fontSize: 12,
                      color: colors.foreground,
                    }}
                  >
                    {s}
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          <Text style={sectionHeader(colors)}>Languages</Text>
          <Card>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {mentor.languages.map((l) => (
                <View
                  key={l}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    backgroundColor: "#EAE2FF",
                    borderRadius: 999,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 12,
                      color: colors.primary,
                    }}
                  >
                    {l}
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          <Text style={sectionHeader(colors)}>Book a session</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {SLOTS.map((s) => {
              const active = slot === s;
              return (
                <Pressable key={s} onPress={() => setSlot(s)}>
                  <View
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 14,
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
                      {s}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={{ marginTop: 20, gap: 10 }}>
            {mentor.online ? (
              <View>
                <Button
                  label={`Help now · ${mentor.pricePer10Min} coins`}
                  icon="phone-call"
                  onPress={handleHelpNow}
                  fullWidth
                  size="lg"
                />
              </View>
            ) : null}
            <Button
              label={slot ? `Book ${slot}` : "Pick a time slot"}
              icon="calendar"
              variant={slot ? "secondary" : "outline"}
              onPress={handleBook}
              disabled={!slot}
              fullWidth
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                marginTop: 8,
              }}
            >
              <CoinBadge amount={state.coins} size="sm" />
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 12,
                  color: colors.mutedForeground,
                }}
              >
                in your wallet
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

function StatCard({
  icon,
  iconColor,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  iconColor: string;
  label: string;
  value: string;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Feather name={icon} size={16} color={iconColor} />
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          fontSize: 18,
          color: colors.foreground,
          marginTop: 8,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: "Inter_500Medium",
          fontSize: 11,
          color: colors.mutedForeground,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function sectionHeader(colors: ReturnType<typeof useColors>) {
  return {
    fontFamily: "Inter_700Bold" as const,
    fontSize: 18,
    color: colors.foreground,
    marginTop: 24,
    marginBottom: 12,
  };
}
