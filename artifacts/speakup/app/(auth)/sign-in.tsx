import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { Pressable } from "@/components/Pressable";
import { useAuth } from "@/context/AuthContext";

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && password.length >= 1;

  const onSubmit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      // Routing gate will redirect based on onboarded flag.
      router.replace("/");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (
        e instanceof TypeError ||
        msg.includes("Network request failed") ||
        msg.includes("Failed to fetch") ||
        msg.includes("fetch failed")
      ) {
        setError("Can't reach the server. Check your internet connection and try again.");
      } else if (msg.includes("401")) {
        setError("Wrong email or password.");
      } else {
        setError(msg || "Could not sign in. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F5FF" }}>
      <LinearGradient
        colors={["#3A1F9E", "#5B3DFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 280 }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 24),
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 22,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="arrow-left" size={18} color="#FFFFFF" />
          </Pressable>

          <View style={{ marginTop: 28 }}>
            <Text
              style={{
                color: "#FFFFFF",
                fontFamily: "Inter_700Bold",
                fontSize: 28,
                lineHeight: 34,
                letterSpacing: -0.4,
              }}
            >
              Welcome back
            </Text>
            <Text
              style={{
                color: "#FFFFFF",
                opacity: 0.85,
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                marginTop: 8,
              }}
            >
              Sign in to keep your streak alive.
            </Text>
          </View>

          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 22,
              padding: 18,
              marginTop: 32,
              gap: 14,
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
            }}
          >
            <Field
              icon="mail"
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              icon="lock"
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="your password"
              secureTextEntry
            />
            {error ? (
              <Text
                style={{
                  color: "#B0181F",
                  fontFamily: "Inter_500Medium",
                  fontSize: 13,
                }}
              >
                {error}
              </Text>
            ) : null}
            <Button
              label={submitting ? "Signing in…" : "Sign in"}
              icon="arrow-right"
              onPress={onSubmit}
              disabled={!valid || submitting}
              loading={submitting}
              fullWidth
              size="lg"
            />
            <Pressable
              onPress={() => router.replace("/(auth)/magic-link")}
              style={{ alignItems: "center", paddingVertical: 4 }}
            >
              <Text
                style={{
                  color: "#5B3DFF",
                  fontFamily: "Inter_700Bold",
                  fontSize: 14,
                }}
              >
                Use a magic link instead →
              </Text>
            </Pressable>
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginTop: 22,
              gap: 6,
            }}
          >
            <Text
              style={{
                color: "#5C5680",
                fontFamily: "Inter_500Medium",
                fontSize: 14,
              }}
            >
              New to BuddyTalk+?
            </Text>
            <Pressable onPress={() => router.replace("/(auth)/sign-up")}>
              <Text
                style={{
                  color: "#5B3DFF",
                  fontFamily: "Inter_700Bold",
                  fontSize: 14,
                }}
              >
                Create an account
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({
  icon,
  label,
  ...input
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View>
      <Text
        style={{
          fontFamily: "Inter_600SemiBold",
          fontSize: 12,
          color: "#5C5680",
          marginBottom: 6,
          letterSpacing: 0.3,
        }}
      >
        {label.toUpperCase()}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backgroundColor: "#F4F2FB",
          borderRadius: 14,
          paddingHorizontal: 14,
          height: 52,
        }}
      >
        <Feather name={icon} size={16} color="#5C5680" />
        <TextInput
          {...input}
          placeholderTextColor="#9C97B8"
          style={{
            flex: 1,
            fontFamily: "Inter_500Medium",
            fontSize: 15,
            color: "#1A1530",
          }}
        />
      </View>
    </View>
  );
}
