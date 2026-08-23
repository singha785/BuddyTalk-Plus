import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

export default function OTPVerify() {
  const insets = useSafeAreaInsets();
  const { verifyPhoneOTP, sendPhoneOTP } = useAuth();
  const params = useLocalSearchParams<{
    phone: string;
    purpose: "signin" | "signup";
    name?: string;
    devOtp?: string;
  }>();

  const phone = params.phone ?? "";
  const purpose = params.purpose ?? "signin";
  const name = params.name ?? "";
  const initialDevOtp = params.devOtp && params.devOtp.length > 0 ? params.devOtp : null;

  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(initialDevOtp);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resend cooldown
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = (secs = RESEND_COOLDOWN) => {
    setCooldown(secs);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    startCooldown();
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 6-box OTP input refs
  const inputRefs = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));

  const handleOTPChange = (text: string, idx: number) => {
    const cleaned = text.replace(/\D/g, "");
    // Handle paste of full code
    if (cleaned.length > 1) {
      const full = cleaned.slice(0, OTP_LENGTH);
      setOtp(full);
      inputRefs.current[Math.min(full.length - 1, OTP_LENGTH - 1)]?.focus();
      return;
    }
    const digit = cleaned.slice(0, 1);
    const newOtp = (otp.slice(0, idx) + digit + otp.slice(idx + 1)).slice(0, OTP_LENGTH);
    setOtp(newOtp);
    setError(null);
    if (digit && idx < OTP_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleOTPKeyPress = (key: string, idx: number) => {
    if (key === "Backspace") {
      if (otp[idx]) {
        // Clear current box
        const newOtp = otp.slice(0, idx) + "" + otp.slice(idx + 1);
        setOtp(newOtp);
      } else if (idx > 0) {
        // Move back and clear
        const newOtp = otp.slice(0, idx - 1) + "" + otp.slice(idx);
        setOtp(newOtp);
        inputRefs.current[idx - 1]?.focus();
      }
    }
  };

  const onVerify = async () => {
    if (otp.length !== OTP_LENGTH || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await verifyPhoneOTP(phone, otp, name);
      if (purpose === "signup") {
        router.replace("/onboarding");
      } else {
        router.replace("/");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("invalid_otp") || msg.includes("401")) {
        setError("That code is incorrect or expired. Please check and try again.");
      } else if (e instanceof TypeError || msg.includes("fetch failed")) {
        setError("Can't reach the server. Check your connection.");
      } else {
        setError(msg || "Verification failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    if (cooldown > 0) return;
    try {
      const result = await sendPhoneOTP(phone, purpose);
      setDevOtp(result.devOtp);
      setOtp("");
      setError(null);
      startCooldown();
      inputRefs.current[0]?.focus();
    } catch {
      setError("Could not resend code. Please try again.");
    }
  };

  const formattedPhone = phone.length > 7
    ? `+${phone.slice(0, phone.length - 10)} (${phone.slice(-10, -7)}) ${phone.slice(-7, -4)}-${phone.slice(-4)}`
    : `+${phone}`;

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F5FF" }}>
      <LinearGradient
        colors={["#3A1F9E", "#5B3DFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 260 }}
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
              Verify your{"\n"}phone number
            </Text>
            <Text style={{ color: "#FFFFFF", opacity: 0.85, fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 8, lineHeight: 20 }}>
              We sent a 6-digit code to{"\n"}
              <Text style={{ fontFamily: "Inter_700Bold" }}>{formattedPhone}</Text>
            </Text>
          </View>

          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 22, padding: 22, marginTop: 32, gap: 20, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }}>

            {/* Dev mode OTP hint */}
            {devOtp && (
              <View style={{ backgroundColor: "#FFF1D6", borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Feather name="terminal" size={14} color="#7A4A00" />
                <View>
                  <Text style={{ color: "#7A4A00", fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.4 }}>DEV MODE — YOUR OTP</Text>
                  <Text style={{ color: "#7A4A00", fontFamily: "Inter_700Bold", fontSize: 26, letterSpacing: 6, marginTop: 2 }}>{devOtp}</Text>
                </View>
              </View>
            )}

            {/* 6-box OTP input */}
            <View>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#5C5680", marginBottom: 12, letterSpacing: 0.3, textAlign: "center" }}>
                ENTER 6-DIGIT CODE
              </Text>
              <View style={{ flexDirection: "row", gap: 8, justifyContent: "center" }}>
                {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                  const digit = otp[i] ?? "";
                  const isFocused = otp.length === i || (otp.length === OTP_LENGTH && i === OTP_LENGTH - 1);
                  return (
                    <TextInput
                      key={i}
                      ref={(ref) => { inputRefs.current[i] = ref; }}
                      value={digit}
                      onChangeText={(t) => handleOTPChange(t, i)}
                      onKeyPress={(e) => handleOTPKeyPress(e.nativeEvent.key, i)}
                      keyboardType="number-pad"
                      maxLength={OTP_LENGTH}
                      // iOS: enables QuickType one-time code autofill
                      textContentType="oneTimeCode"
                      selectTextOnFocus
                      style={{
                        width: 46,
                        height: 58,
                        borderRadius: 14,
                        backgroundColor: digit ? "#EAE2FF" : "#F4F2FB",
                        borderWidth: 2,
                        borderColor: digit ? "#5B3DFF" : isFocused ? "#5B3DFF" : "#E2DCFB",
                        textAlign: "center",
                        fontSize: 24,
                        fontFamily: "Inter_700Bold",
                        color: "#1A1530",
                      }}
                    />
                  );
                })}
              </View>
            </View>

            {error && (
              <Text style={{ color: "#B0181F", fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "center" }}>
                {error}
              </Text>
            )}

            <Button
              label={submitting ? "Verifying…" : "Verify"}
              icon="check"
              onPress={onVerify}
              disabled={otp.length !== OTP_LENGTH || submitting}
              loading={submitting}
              fullWidth
              size="lg"
            />

            {/* Resend */}
            <Pressable
              onPress={cooldown === 0 ? onResend : undefined}
              style={{ alignItems: "center", paddingVertical: 4 }}
            >
              <Text style={{ color: cooldown > 0 ? "#9C97B8" : "#5B3DFF", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </Text>
            </Pressable>

            {/* Android SMS autofill note */}
            {Platform.OS === "android" && (
              <Text style={{ color: "#9C97B8", fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center", lineHeight: 17 }}>
                {/* TODO: Add react-native-otp-verify for automatic SMS autofill on Android */}
                On Android, copy the code from your SMS to fill in automatically.
              </Text>
            )}
          </View>

          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 22, gap: 6 }}>
            <Text style={{ color: "#5C5680", fontFamily: "Inter_500Medium", fontSize: 14 }}>Wrong number?</Text>
            <Pressable onPress={() => router.back()}>
              <Text style={{ color: "#5B3DFF", fontFamily: "Inter_700Bold", fontSize: 14 }}>Go back</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
