import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { Pressable } from "@/components/Pressable";

export default function Welcome() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: "#F7F5FF" }}>
      <LinearGradient
        colors={["#3A1F9E", "#5B3DFF", "#FF7A45"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 480 }}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 48),
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 22,
          flexGrow: 1,
        }}
      >
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 28,
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.28)",
            }}
          >
            <Feather name="mic" size={38} color="#FFFFFF" />
          </View>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 13,
              letterSpacing: 3,
              color: "#FFFFFF",
              opacity: 0.9,
              marginTop: 18,
            }}
          >
            BUDDYTALK+
          </Text>
        </View>

        <View style={{ marginTop: 36 }}>
          <Text
            style={{
              color: "#FFFFFF",
              fontFamily: "Inter_700Bold",
              fontSize: 36,
              lineHeight: 42,
              letterSpacing: -0.5,
              textAlign: "center",
            }}
          >
            Talk to real{"\n"}English buddies.
          </Text>
          <Text
            style={{
              color: "#FFFFFF",
              opacity: 0.92,
              fontFamily: "Inter_400Regular",
              fontSize: 15,
              lineHeight: 22,
              textAlign: "center",
              marginTop: 14,
              paddingHorizontal: 12,
            }}
          >
            Live voice practice with mentors and learners across South Asia. Free
            20 minutes daily. No credit card.
          </Text>
        </View>

        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 24,
            padding: 22,
            marginTop: 44,
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 12 },
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 20,
              color: "#1A1530",
              textAlign: "center",
            }}
          >
            Get started
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: "#5C5680",
              textAlign: "center",
              marginTop: 6,
            }}
          >
            Create a free account or sign in to your buddies.
          </Text>
          <View style={{ marginTop: 22, gap: 10 }}>
            <Button
              label="Create an account"
              icon="user-plus"
              onPress={() => router.push("/(auth)/sign-up")}
              fullWidth
              size="lg"
            />
            <Button
              label="I already have one"
              variant="outline"
              icon="log-in"
              onPress={() => router.push("/(auth)/sign-in")}
              fullWidth
              size="lg"
            />
            <Pressable
              onPress={() => router.push("/(auth)/magic-link")}
              style={{ alignItems: "center", paddingVertical: 10 }}
            >
              <Text
                style={{
                  color: "#5B3DFF",
                  fontFamily: "Inter_700Bold",
                  fontSize: 14,
                }}
              >
                Email me a magic link instead →
              </Text>
            </Pressable>
          </View>
        </View>

        <Text
          style={{
            color: "#FFFFFF",
            opacity: 0.85,
            fontFamily: "Inter_500Medium",
            fontSize: 12,
            textAlign: "center",
            marginTop: 22,
            paddingHorizontal: 12,
          }}
        >
          By continuing you agree to our friendly community rules — be kind,
          stay safe.
        </Text>
      </ScrollView>
    </View>
  );
}
