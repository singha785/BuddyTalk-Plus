import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { Pressable } from "@/components/Pressable";
import { useAuth } from "@/context/AuthContext";

const RESEND_COOLDOWN = 30;
const IS_DEV = process.env.NODE_ENV !== "production";

export default function ForgotPassword() {
  const insets = useSafeAreaInsets();
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"input" | "sent">("input");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resend cooldown
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const onSend = async () => {
    if (!emailValid || submitting || cooldown > 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await forgotPassword(email.trim());
      setDevCode(result.devCode);
      setStep("sent");
      startCooldown();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (e instanceof TypeError || msg.includes("fetch failed")) {
        setError("Can't reach the server. Check your connection.");
      } else {
        setError(msg || "Could not send reset code. Please try again.");
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
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 240 }}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
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
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}
          >
            <Feather name="arrow-left" size={18} color="#FFFFFF" />
          </Pressable>

          <View style={{ marginTop: 28 }}>
            <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 28, lineHeight: 34, letterSpacing: -0.4 }}>
              {step === "input" ? "Reset password" : "Check your email"}
            </Text>
            <Text style={{ color: "#FFFFFF", opacity: 0.85, fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 8, lineHeight: 20 }}>
              {step === "input"
                ? "Enter your email and we'll send you a 6-digit reset code."
                : `We sent a code to ${email}. Enter it on the next screen.`}
            </Text>
          </View>

          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 22, padding: 18, marginTop: 32, gap: 16, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }}>

            {step === "input" && (
              <>
                <FieldInput
                  icon="mail"
                  label="Email address"
                  value={email}
                  onChangeText={(v) => { setEmail(v); setError(null); }}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {error && <Text style={{ color: "#B0181F", fontFamily: "Inter_500Medium", fontSize: 13 }}>{error}</Text>}
                <Button
                  label={submitting ? "Sending…" : "Send reset code"}
                  icon="send"
                  onPress={onSend}
                  disabled={!emailValid || submitting}
                  loading={submitting}
                  fullWidth
                  size="lg"
                />
              </>
            )}

            {step === "sent" && (
              <>
                <View style={{ backgroundColor: "#DDF5EE", borderRadius: 16, padding: 16, flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                  <Feather name="check-circle" size={20} color="#0E6F5A" style={{ marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#0E6F5A", fontFamily: "Inter_700Bold", fontSize: 14 }}>Code sent!</Text>
                    <Text style={{ color: "#0E6F5A", fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4, lineHeight: 18 }}>
                      A 6-digit reset code was sent to your email. It expires in 15 minutes.
                    </Text>
                  </View>
                </View>

                {/* Dev mode: show the code */}
                {devCode && (
                  <View style={{ backgroundColor: "#FFF1D6", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Feather name="terminal" size={14} color="#7A4A00" />
                    <View>
                      <Text style={{ color: "#7A4A00", fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.4 }}>DEV MODE — RESET CODE</Text>
                      <Text style={{ color: "#7A4A00", fontFamily: "Inter_700Bold", fontSize: 24, letterSpacing: 4, marginTop: 2 }}>{devCode}</Text>
                    </View>
                  </View>
                )}

                <Button
                  label="Enter reset code"
                  icon="arrow-right"
                  onPress={() => router.push({ pathname: "/(auth)/reset-password", params: { email: email.trim() } })}
                  fullWidth
                  size="lg"
                />

                {/* Resend button */}
                <Pressable
                  onPress={cooldown === 0 ? onSend : undefined}
                  style={{ alignItems: "center", paddingVertical: 6 }}
                >
                  <Text style={{ color: cooldown > 0 ? "#9C97B8" : "#5B3DFF", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                  </Text>
                </Pressable>
              </>
            )}
          </View>

          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 22, gap: 6 }}>
            <Text style={{ color: "#5C5680", fontFamily: "Inter_500Medium", fontSize: 14 }}>Remembered it?</Text>
            <Pressable onPress={() => router.replace("/(auth)/sign-in")}>
              <Text style={{ color: "#5B3DFF", fontFamily: "Inter_700Bold", fontSize: 14 }}>Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

import { TextInput } from "react-native";

function FieldInput({
  icon, label, ...input
}: { icon: React.ComponentProps<typeof Feather>["name"]; label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View>
      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#5C5680", marginBottom: 6, letterSpacing: 0.3 }}>
        {label.toUpperCase()}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F4F2FB", borderRadius: 14, paddingHorizontal: 14, height: 52 }}>
        <Feather name={icon} size={16} color="#5C5680" />
        <TextInput {...input} placeholderTextColor="#9C97B8" style={{ flex: 1, fontFamily: "Inter_500Medium", fontSize: 15, color: "#1A1530" }} />
      </View>
    </View>
  );
}
