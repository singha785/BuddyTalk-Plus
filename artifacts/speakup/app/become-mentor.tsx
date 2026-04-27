import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import React from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CoinBadge } from "@/components/CoinBadge";
import { Pill } from "@/components/Pill";
import { useColors } from "@/hooks/useColors";
import { showAlert } from "@/utils/alert";

const STEPS = [
  {
    icon: "mic" as const,
    title: "AI speaking test",
    description: "Speak for 2 minutes, our coach will rate your fluency.",
  },
  {
    icon: "user-check" as const,
    title: "Profile review",
    description: "Add your bio, languages, and availability.",
  },
  {
    icon: "headphones" as const,
    title: "Trial session",
    description: "Help your first learner under our guidance.",
  },
];

const TIERS = [
  { name: "Helper", reward: "10 coins / 10 min" },
  { name: "Mentor", reward: "18 coins / 10 min" },
  { name: "Pro Mentor", reward: "24 coins / 10 min" },
];

export default function BecomeMentor() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const startTest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    showAlert(
      "Speaking test",
      "Find a quiet space and speak for 2 minutes about why you want to become a mentor. We'll evaluate fluency and clarity.",
      [
        { text: "Maybe later", style: "cancel" },
        { text: "Start test", onPress: () => router.push("/practice") },
      ],
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Become a mentor",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleStyle: { fontFamily: "Inter_700Bold" },
        }}
      />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: Platform.OS === "web" ? 24 : 8,
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={["#16A085", "#0E6F5A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 24,
              padding: 24,
            }}
          >
            <Pill label="EARN WITH SPEAKUP" tone="warning" />
            <Text
              style={{
                color: "#FFFFFF",
                fontFamily: "Inter_700Bold",
                fontSize: 26,
                marginTop: 14,
                lineHeight: 32,
              }}
            >
              Teach English.{"\n"}Earn coins. Cash out.
            </Text>
            <Text
              style={{
                color: "#FFFFFF",
                opacity: 0.92,
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                marginTop: 10,
                lineHeight: 20,
              }}
            >
              You speak well. Help beginners practice and earn 18 coins for every
              10-minute session. Withdraw to UPI, bKash and other local methods.
            </Text>
            <View style={{ marginTop: 18 }}>
              <Button
                label="Start your speaking test"
                icon="mic"
                onPress={startTest}
                variant="outline"
                fullWidth
              />
            </View>
          </LinearGradient>

          <Text style={sectionHeader(colors)}>How it works</Text>
          <View style={{ gap: 10 }}>
            {STEPS.map((s, i) => (
              <Card key={s.title}>
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
                      backgroundColor: "#EAE2FF",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather name={s.icon} size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: "Inter_500Medium",
                        fontSize: 11,
                        color: colors.mutedForeground,
                        letterSpacing: 1,
                      }}
                    >
                      STEP {i + 1}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter_700Bold",
                        fontSize: 15,
                        color: colors.foreground,
                        marginTop: 2,
                      }}
                    >
                      {s.title}
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
                      {s.description}
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>

          <Text style={sectionHeader(colors)}>Earnings by level</Text>
          <Card>
            <View style={{ gap: 14 }}>
              {TIERS.map((t) => (
                <View
                  key={t.name}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 14,
                      color: colors.foreground,
                    }}
                  >
                    {t.name}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <CoinBadge amount={parseInt(t.reward, 10)} size="sm" />
                    <Text
                      style={{
                        fontFamily: "Inter_500Medium",
                        fontSize: 12,
                        color: colors.mutedForeground,
                      }}
                    >
                      / 10 min
                    </Text>
                  </View>
                </View>
              ))}
              <View
                style={{
                  marginTop: 4,
                  paddingTop: 14,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                    color: colors.mutedForeground,
                    lineHeight: 18,
                  }}
                >
                  BuddyTalk+ keeps a 12-coin commission per session to support
                  matching, payments and safety.
                </Text>
              </View>
            </View>
          </Card>

          <View style={{ marginTop: 24 }}>
            <Button
              label="Apply to be a mentor"
              icon="arrow-right"
              onPress={startTest}
              fullWidth
              size="lg"
            />
          </View>
        </ScrollView>
      </View>
    </>
  );
}

function sectionHeader(colors: ReturnType<typeof useColors>) {
  return {
    fontFamily: "Inter_700Bold" as const,
    fontSize: 18,
    color: colors.foreground,
    marginTop: 28,
    marginBottom: 12,
  };
}
