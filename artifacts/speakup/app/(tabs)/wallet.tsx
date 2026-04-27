import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CoinBadge } from "@/components/CoinBadge";
import { Pill } from "@/components/Pill";
import { Pressable } from "@/components/Pressable";
import { CONSTANTS, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { showAlert } from "@/utils/alert";

const COIN_PACKS = [
  { id: "starter", coins: 20, price: "₹10", popular: false },
  { id: "value", coins: 50, price: "₹20", popular: true },
  { id: "saver", coins: 130, price: "₹49", popular: false },
  { id: "pro", coins: 300, price: "₹99", popular: false },
];

export default function WalletTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    state,
    addCoins,
    watchAdReward,
    setPremium,
    adsRemainingToday,
  } = useApp();

  const [adLoading, setAdLoading] = useState<boolean>(false);

  const handleAd = async () => {
    if (adsRemainingToday <= 0) {
      showAlert("All caught up", "You've watched the maximum ads for today. Come back tomorrow!");
      return;
    }
    setAdLoading(true);
    // Simulate watching a rewarded ad with a 3 second wait
    await new Promise((r) => setTimeout(r, 2000));
    const result = await watchAdReward();
    setAdLoading(false);
    if (result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      showAlert("Coins added", `You earned ${CONSTANTS.COIN_AD_REWARD} coins.`);
    } else if (result.reason) {
      showAlert("Limit reached", result.reason);
    }
  };

  const handleBuyPack = (pack: (typeof COIN_PACKS)[number]) => {
    showAlert(
      "Buy coins",
      `Get ${pack.coins} coins for ${pack.price}? In-app purchases activate after publishing.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add (demo)",
          onPress: async () => {
            await addCoins(pack.coins);
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            ).catch(() => undefined);
          },
        },
      ],
    );
  };

  const handlePremium = () => {
    if (state.premium) {
      showAlert("Cancel premium?", "You'll lose extra daily minutes and reduced ads.", [
        { text: "Keep premium", style: "cancel" },
        {
          text: "Cancel",
          style: "destructive",
          onPress: () => setPremium(false),
        },
      ]);
      return;
    }
    showAlert(
      "SpeakUp Premium",
      "Unlock 40 daily minutes, smarter matches, fewer ads — ₹29/month.",
      [
        { text: "Maybe later", style: "cancel" },
        {
          text: "Activate (demo)",
          onPress: () => {
            setPremium(true);
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            ).catch(() => undefined);
          },
        },
      ],
    );
  };

  const handleEarnings = () => {
    showAlert(
      "Mentor earnings",
      "You need to apply and pass the speaking test to start earning. Want to begin now?",
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Apply",
          onPress: () => router.push("/become-mentor"),
        },
      ],
    );
  };

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
          Wallet
        </Text>

        <LinearGradient
          colors={["#1A1530", "#3A2A66"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 24,
            padding: 22,
            marginTop: 18,
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              opacity: 0.7,
              fontFamily: "Inter_500Medium",
              fontSize: 13,
              letterSpacing: 1.5,
            }}
          >
            BALANCE
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginTop: 8,
            }}
          >
            <Feather name="zap" size={28} color="#F5A524" />
            <Text
              style={{
                color: "#FFFFFF",
                fontFamily: "Inter_700Bold",
                fontSize: 38,
              }}
            >
              {state.coins}
            </Text>
          </View>
          <Text
            style={{
              color: "#FFFFFF",
              opacity: 0.75,
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              marginTop: 8,
            }}
          >
            1 minute talk = 2 coins · 10 min mentor = 30 coins
          </Text>
          <View
            style={{
              flexDirection: "row",
              gap: 16,
              marginTop: 18,
              paddingTop: 18,
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.1)",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "#FFFFFF",
                  opacity: 0.6,
                  fontFamily: "Inter_500Medium",
                  fontSize: 11,
                }}
              >
                Calls today
              </Text>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontFamily: "Inter_700Bold",
                  fontSize: 18,
                  marginTop: 2,
                }}
              >
                {state.totalCalls}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "#FFFFFF",
                  opacity: 0.6,
                  fontFamily: "Inter_500Medium",
                  fontSize: 11,
                }}
              >
                Mins spoken
              </Text>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontFamily: "Inter_700Bold",
                  fontSize: 18,
                  marginTop: 2,
                }}
              >
                {state.totalMinutesSpoken}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "#FFFFFF",
                  opacity: 0.6,
                  fontFamily: "Inter_500Medium",
                  fontSize: 11,
                }}
              >
                Plan
              </Text>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontFamily: "Inter_700Bold",
                  fontSize: 18,
                  marginTop: 2,
                }}
              >
                {state.premium ? "Premium" : "Free"}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Earn coins via ads */}
        <Text style={sectionHeader(colors)}>Earn free coins</Text>
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
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: "#FFE9DD",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="play-circle" size={24} color="#FF7A45" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 15,
                  color: colors.foreground,
                }}
              >
                Watch a short video
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  color: colors.mutedForeground,
                  marginTop: 2,
                }}
              >
                +{CONSTANTS.COIN_AD_REWARD} coins · {adsRemainingToday} left today
              </Text>
            </View>
            <Pressable onPress={handleAd} disabled={adLoading || adsRemainingToday <= 0}>
              <View
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 999,
                  opacity: adLoading || adsRemainingToday <= 0 ? 0.5 : 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {adLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="play" size={12} color="#FFFFFF" />
                )}
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontFamily: "Inter_700Bold",
                    fontSize: 13,
                  }}
                >
                  Watch
                </Text>
              </View>
            </Pressable>
          </View>
        </Card>

        {/* Buy coin packs */}
        <Text style={sectionHeader(colors)}>Buy coin packs</Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          {COIN_PACKS.map((pack) => (
            <Pressable
              key={pack.id}
              onPress={() => handleBuyPack(pack)}
              style={{ flexBasis: "48%", flexGrow: 1 }}
            >
              <Card>
                {pack.popular ? (
                  <View style={{ marginBottom: 8 }}>
                    <Pill label="Best value" tone="accent" />
                  </View>
                ) : null}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <CoinBadge amount={pack.coins} />
                </View>
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 22,
                    color: colors.foreground,
                    marginTop: 12,
                  }}
                >
                  {pack.price}
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                    color: colors.mutedForeground,
                    marginTop: 4,
                  }}
                >
                  Tap to purchase
                </Text>
              </Card>
            </Pressable>
          ))}
        </View>

        {/* Premium */}
        <Text style={sectionHeader(colors)}>Premium</Text>
        <LinearGradient
          colors={["#FF7A45", "#F5A524"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 22,
            padding: 22,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontFamily: "Inter_700Bold",
                fontSize: 22,
              }}
            >
              SpeakUp Premium
            </Text>
            <Feather name="award" size={28} color="#FFFFFF" />
          </View>
          <Text
            style={{
              color: "#FFFFFF",
              opacity: 0.95,
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              marginTop: 8,
              lineHeight: 20,
            }}
          >
            40 minutes daily, smarter mentor matching, and reduced ads. Just ₹29/month.
          </Text>
          <View style={{ marginTop: 16 }}>
            <Button
              label={state.premium ? "Manage subscription" : "Activate Premium"}
              variant="outline"
              onPress={handlePremium}
              fullWidth
            />
          </View>
        </LinearGradient>

        {/* Withdraw earnings */}
        <Text style={sectionHeader(colors)}>Mentor earnings</Text>
        <Pressable onPress={handleEarnings}>
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
                <Feather name="dollar-sign" size={20} color="#0E6F5A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 15,
                    color: colors.foreground,
                  }}
                >
                  Withdraw to UPI / bKash
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 13,
                    color: colors.mutedForeground,
                    marginTop: 2,
                  }}
                >
                  Become a mentor first to start earning
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
      </ScrollView>
    </View>
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
