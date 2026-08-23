import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable as RNPressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { Pressable } from "@/components/Pressable";
import { useAuth } from "@/context/AuthContext";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECS = 30;
const BIOMETRIC_KEY = "buddytalk.biometric.enabled";

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const auth = useAuth();

  // ── Tab: email vs phone ──────────────────────────────────────────────────
  const [tab, setTab] = useState<"email" | "phone">("email");

  // ── Email form ───────────────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ── Phone form ───────────────────────────────────────────────────────────
  const [phone, setPhone] = useState("");

  // ── Submission state ─────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Rate limiting ────────────────────────────────────────────────────────
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutEndsAt, setLockoutEndsAt] = useState<number | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const lockoutRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!lockoutEndsAt) return;
    lockoutRef.current = setInterval(() => {
      const rem = Math.ceil((lockoutEndsAt - Date.now()) / 1000);
      if (rem <= 0) {
        clearInterval(lockoutRef.current!);
        setLockoutEndsAt(null);
        setLockoutRemaining(0);
        setFailedAttempts(0);
      } else {
        setLockoutRemaining(rem);
      }
    }, 500);
    return () => { if (lockoutRef.current) clearInterval(lockoutRef.current); };
  }, [lockoutEndsAt]);

  // ── Biometric ────────────────────────────────────────────────────────────
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioType, setBioType] = useState("Biometrics");

  useEffect(() => {
    (async () => {
      if (Platform.OS === "web") return;
      const hw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hw || !enrolled) return;
      setBioAvailable(true);
      const pref = await AsyncStorage.getItem(BIOMETRIC_KEY);
      setBioEnabled(pref === "true");
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBioType("Face ID");
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBioType("Fingerprint");
      }
    })();
  }, []);

  const handleBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Sign in to BuddyTalk+",
        fallbackLabel: "Use password",
      });
      if (result.success) {
        await auth.refresh();
        router.replace("/");
      } else {
        setError("Biometric authentication failed. Use your password instead.");
      }
    } catch {
      setError("Biometric not available. Please sign in with your password.");
    }
  };

  // ── Email submit ─────────────────────────────────────────────────────────
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && password.length >= 1;

  const onEmailSubmit = async () => {
    if (!emailValid || submitting || lockoutEndsAt) return;
    setSubmitting(true);
    setError(null);
    try {
      await auth.signIn(email.trim(), password);
      // Enable biometric on first successful sign-in if hardware is available
      if (bioAvailable && !bioEnabled) {
        await AsyncStorage.setItem(BIOMETRIC_KEY, "true");
      }
      router.replace("/");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      let display: string;
      if (e instanceof TypeError || msg.includes("Network request failed") || msg.includes("fetch failed")) {
        display = "Can't reach the server. Check your connection and try again.";
      } else if (msg.includes("401")) {
        display = "Wrong email or password.";
      } else {
        display = msg || "Could not sign in. Please try again.";
      }
      setError(display);
      setFailedAttempts((prev) => {
        const next = prev + 1;
        if (next >= MAX_ATTEMPTS) {
          setLockoutEndsAt(Date.now() + LOCKOUT_SECS * 1000);
          setLockoutRemaining(LOCKOUT_SECS);
        }
        return next;
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Phone submit ─────────────────────────────────────────────────────────
  const phoneNormalized = phone.replace(/\D/g, "");
  const phoneValid = phoneNormalized.length >= 7;

  const onSendOTP = async () => {
    if (!phoneValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { devOtp } = await auth.sendPhoneOTP(phone, "signin");
      router.push({
        pathname: "/(auth)/otp-verify",
        params: { phone: phoneNormalized, purpose: "signin", devOtp: devOtp ?? "" },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(msg || "Could not send OTP. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isLocked = !!lockoutEndsAt;

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F5FF" }}>
      <LinearGradient
        colors={["#3A1F9E", "#5B3DFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 280 }}
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
          {/* Back button */}
          <Pressable
            onPress={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}
          >
            <Feather name="arrow-left" size={18} color="#FFFFFF" />
          </Pressable>

          {/* Heading */}
          <View style={{ marginTop: 28 }}>
            <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 28, lineHeight: 34, letterSpacing: -0.4 }}>
              Welcome back
            </Text>
            <Text style={{ color: "#FFFFFF", opacity: 0.85, fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 8 }}>
              Sign in to keep your streak alive.
            </Text>
          </View>

          {/* Biometric quick-sign-in (shown before form when available + enabled) */}
          {bioAvailable && bioEnabled && (
            <RNPressable
              onPress={handleBiometric}
              style={{ marginTop: 20, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 18, paddingVertical: 14, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Feather name="unlock" size={18} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 15 }}>
                Sign in with {bioType}
              </Text>
              <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.6)" style={{ marginLeft: "auto" }} />
            </RNPressable>
          )}

          {/* Form card */}
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 22, padding: 18, marginTop: 24, gap: 14, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }}>

            {/* Email / Phone tab toggle */}
            <View style={{ flexDirection: "row", backgroundColor: "#F4F2FB", borderRadius: 14, padding: 4 }}>
              {(["email", "phone"] as const).map((t) => (
                <RNPressable
                  key={t}
                  onPress={() => { setTab(t); setError(null); }}
                  style={{ flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10, backgroundColor: tab === t ? "#5B3DFF" : "transparent" }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Feather name={t === "email" ? "mail" : "smartphone"} size={14} color={tab === t ? "#FFFFFF" : "#5C5680"} />
                    <Text style={{ color: tab === t ? "#FFFFFF" : "#5C5680", fontFamily: "Inter_700Bold", fontSize: 14 }}>
                      {t === "email" ? "Email" : "Phone"}
                    </Text>
                  </View>
                </RNPressable>
              ))}
            </View>

            {/* ── Email tab ─────────────────────────────────────────────── */}
            {tab === "email" && (
              <>
                <Field
                  icon="mail"
                  label="Email"
                  value={email}
                  onChangeText={(v) => { setEmail(v); setError(null); }}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                <PasswordField
                  label="Password"
                  value={password}
                  onChangeText={(v) => { setPassword(v); setError(null); }}
                  placeholder="your password"
                  show={showPassword}
                  onToggleShow={() => setShowPassword((s) => !s)}
                  autoComplete="password"
                />

                {/* Forgot password link */}
                <RNPressable onPress={() => router.push("/(auth)/forgot-password")} style={{ alignSelf: "flex-end", marginTop: -6 }}>
                  <Text style={{ color: "#5B3DFF", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                    Forgot password?
                  </Text>
                </RNPressable>

                {/* Rate-limit lockout */}
                {isLocked && (
                  <View style={{ backgroundColor: "#FFF1D6", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Feather name="clock" size={14} color="#7A4A00" />
                    <Text style={{ color: "#7A4A00", fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 }}>
                      Too many attempts. Try again in {lockoutRemaining}s.
                    </Text>
                  </View>
                )}

                {/* Error */}
                {error && !isLocked && (
                  <Text style={{ color: "#B0181F", fontFamily: "Inter_500Medium", fontSize: 13 }}>{error}</Text>
                )}

                <Button
                  label={submitting ? "Signing in…" : "Sign in"}
                  icon="arrow-right"
                  onPress={onEmailSubmit}
                  disabled={!emailValid || submitting || isLocked}
                  loading={submitting}
                  fullWidth
                  size="lg"
                />

                <Pressable onPress={() => router.replace("/(auth)/magic-link")} style={{ alignItems: "center", paddingVertical: 4 }}>
                  <Text style={{ color: "#5B3DFF", fontFamily: "Inter_700Bold", fontSize: 14 }}>
                    Use a magic link instead →
                  </Text>
                </Pressable>
              </>
            )}

            {/* ── Phone tab ─────────────────────────────────────────────── */}
            {tab === "phone" && (
              <>
                <Field
                  icon="smartphone"
                  label="Phone number"
                  value={phone}
                  onChangeText={(v) => { setPhone(v); setError(null); }}
                  placeholder="+1 555 123 4567"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                />
                <Text style={{ color: "#5C5680", fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 }}>
                  We'll send a 6-digit code to your number.
                </Text>
                {error && <Text style={{ color: "#B0181F", fontFamily: "Inter_500Medium", fontSize: 13 }}>{error}</Text>}
                <Button
                  label={submitting ? "Sending…" : "Send OTP"}
                  icon="arrow-right"
                  onPress={onSendOTP}
                  disabled={!phoneValid || submitting}
                  loading={submitting}
                  fullWidth
                  size="lg"
                />
              </>
            )}
          </View>

          {/* Footer */}
          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 22, gap: 6 }}>
            <Text style={{ color: "#5C5680", fontFamily: "Inter_500Medium", fontSize: 14 }}>
              New to BuddyTalk+?
            </Text>
            <Pressable onPress={() => router.replace("/(auth)/sign-up")}>
              <Text style={{ color: "#5B3DFF", fontFamily: "Inter_700Bold", fontSize: 14 }}>Create an account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Shared field components ──────────────────────────────────────────────────

function Field({
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

function PasswordField({
  label, value, onChangeText, placeholder, show, onToggleShow, autoComplete,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; show: boolean; onToggleShow: () => void;
  autoComplete?: React.ComponentProps<typeof TextInput>["autoComplete"];
}) {
  return (
    <View>
      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#5C5680", marginBottom: 6, letterSpacing: 0.3 }}>
        {label.toUpperCase()}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F4F2FB", borderRadius: 14, paddingHorizontal: 14, height: 52 }}>
        <Feather name="lock" size={16} color="#5C5680" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9C97B8"
          secureTextEntry={!show}
          autoCapitalize="none"
          autoComplete={autoComplete}
          style={{ flex: 1, fontFamily: "Inter_500Medium", fontSize: 15, color: "#1A1530" }}
        />
        <RNPressable onPress={onToggleShow} hitSlop={10}>
          <Feather name={show ? "eye-off" : "eye"} size={18} color="#9C97B8" />
        </RNPressable>
      </View>
    </View>
  );
}
