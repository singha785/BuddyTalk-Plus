import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
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

// ── Password strength ────────────────────────────────────────────────────────

function passwordStrength(pw: string): { level: "weak" | "medium" | "strong"; score: number } {
  if (!pw) return { level: "weak", score: 0 };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return { level: score <= 2 ? "weak" : score <= 4 ? "medium" : "strong", score };
}

const STRENGTH_COLOR = { weak: "#E5484D", medium: "#F5A524", strong: "#16A085" };
const STRENGTH_LABEL = { weak: "Weak", medium: "Medium", strong: "Strong" };

export default function SignUp() {
  const insets = useSafeAreaInsets();
  const { signUp, sendPhoneOTP } = useAuth();

  const [tab, setTab] = useState<"email" | "phone">("email");

  // Email fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Phone fields
  const [phoneName, setPhoneName] = useState("");
  const [phone, setPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Validation ─────────────────────────────────────────────────────────────
  const emailValid =
    name.trim().length >= 1 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    password.length >= 8;

  const emailTouched = email.length > 0;
  const emailFormatOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const { level: pwLevel, score: pwScore } = passwordStrength(password);

  const phoneNormalized = phone.replace(/\D/g, "");
  const phoneValid = phoneName.trim().length >= 1 && phoneNormalized.length >= 7;

  // ── Submit: email ──────────────────────────────────────────────────────────
  const onEmailSubmit = async () => {
    if (!emailValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await signUp(email.trim(), password, name.trim());
      router.replace("/onboarding");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (e instanceof TypeError || msg.includes("Network request failed") || msg.includes("fetch failed")) {
        setError("Can't reach the server. Check your connection and try again.");
      } else if (msg.includes("409")) {
        setError("That email is already registered.");
      } else {
        setError(msg || "Could not create account. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Submit: phone ──────────────────────────────────────────────────────────
  const onSendOTP = async () => {
    if (!phoneValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { devOtp } = await sendPhoneOTP(phone, "signup");
      router.push({
        pathname: "/(auth)/otp-verify",
        params: {
          phone: phoneNormalized,
          purpose: "signup",
          name: phoneName.trim(),
          devOtp: devOtp ?? "",
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(msg || "Could not send OTP. Please try again.");
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 24),
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 22,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <Pressable
            onPress={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}
          >
            <Feather name="arrow-left" size={18} color="#FFFFFF" />
          </Pressable>

          {/* Heading */}
          <View style={{ marginTop: 28 }}>
            <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 28, lineHeight: 34, letterSpacing: -0.4 }}>
              Create your{"\n"}BuddyTalk+ account
            </Text>
            <Text style={{ color: "#FFFFFF", opacity: 0.85, fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 8 }}>
              Start speaking confidently with real partners.
            </Text>
          </View>

          {/* Form card */}
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 22, padding: 18, marginTop: 32, gap: 14, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }}>

            {/* Tab toggle */}
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
                <Field icon="user" label="Your name" value={name} onChangeText={setName} placeholder="e.g. Aisha" autoCapitalize="words" />

                {/* Email with real-time format indicator */}
                <View>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#5C5680", marginBottom: 6, letterSpacing: 0.3 }}>
                    EMAIL
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F4F2FB", borderRadius: 14, paddingHorizontal: 14, height: 52 }}>
                    <Feather name="mail" size={16} color="#5C5680" />
                    <TextInput
                      value={email}
                      onChangeText={(v) => { setEmail(v); setError(null); }}
                      placeholder="you@example.com"
                      placeholderTextColor="#9C97B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      style={{ flex: 1, fontFamily: "Inter_500Medium", fontSize: 15, color: "#1A1530" }}
                    />
                    {emailTouched && (
                      <Feather
                        name={emailFormatOk ? "check-circle" : "alert-circle"}
                        size={16}
                        color={emailFormatOk ? "#16A085" : "#E5484D"}
                      />
                    )}
                  </View>
                </View>

                {/* Password with toggle + strength bar */}
                <View style={{ gap: 8 }}>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#5C5680", marginBottom: 2, letterSpacing: 0.3 }}>
                    PASSWORD
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F4F2FB", borderRadius: 14, paddingHorizontal: 14, height: 52 }}>
                    <Feather name="lock" size={16} color="#5C5680" />
                    <TextInput
                      value={password}
                      onChangeText={(v) => { setPassword(v); setError(null); }}
                      placeholder="at least 8 characters"
                      placeholderTextColor="#9C97B8"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoComplete="new-password"
                      style={{ flex: 1, fontFamily: "Inter_500Medium", fontSize: 15, color: "#1A1530" }}
                    />
                    <RNPressable onPress={() => setShowPassword((s) => !s)} hitSlop={10}>
                      <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#9C97B8" />
                    </RNPressable>
                  </View>
                  {/* Strength bar */}
                  {password.length > 0 && (
                    <View style={{ gap: 4 }}>
                      <View style={{ flexDirection: "row", gap: 4 }}>
                        {[1, 2, 3].map((s) => {
                          const filled = pwScore <= 2 ? 1 : pwScore <= 4 ? 2 : 3;
                          return <View key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: s <= filled ? STRENGTH_COLOR[pwLevel] : "#E2DCFB" }} />;
                        })}
                      </View>
                      <Text style={{ color: STRENGTH_COLOR[pwLevel], fontFamily: "Inter_500Medium", fontSize: 12 }}>
                        {STRENGTH_LABEL[pwLevel]} password
                      </Text>
                    </View>
                  )}
                </View>

                {error && <Text style={{ color: "#B0181F", fontFamily: "Inter_500Medium", fontSize: 13 }}>{error}</Text>}

                <Button
                  label={submitting ? "Creating account…" : "Create account"}
                  icon="arrow-right"
                  onPress={onEmailSubmit}
                  disabled={!emailValid || submitting}
                  loading={submitting}
                  fullWidth
                  size="lg"
                />
              </>
            )}

            {/* ── Phone tab ─────────────────────────────────────────────── */}
            {tab === "phone" && (
              <>
                <Field icon="user" label="Your name" value={phoneName} onChangeText={setPhoneName} placeholder="e.g. Aisha" autoCapitalize="words" />
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
                  We'll send a 6-digit verification code to your number.
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
              Already have an account?
            </Text>
            <Pressable onPress={() => router.replace("/(auth)/sign-in")}>
              <Text style={{ color: "#5B3DFF", fontFamily: "Inter_700Bold", fontSize: 14 }}>Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

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
