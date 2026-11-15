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
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

// Turns a server error into a short message the user can act on.
function friendly(e: unknown, fallback: string, map: Record<string, string> = {}): string {
  const raw = e instanceof Error ? e.message : "";
  if (raw.includes("Network request failed") || raw.includes("fetch failed") || raw.includes("Failed to fetch")) {
    return "Cannot reach the server. Check your connection and try again.";
  }
  for (const key of Object.keys(map)) {
    if (raw.includes(key)) return map[key];
  }
  const cleaned = raw.replace(/^HTTP \d+[^:]*:\s*/, "").trim();
  return cleaned || fallback;
}

export default function SignUp() {
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailTrim = email.trim();
  const emailTouched = email.length > 0;
  const emailFormatOk = EMAIL_RE.test(emailTrim);
  const detailsValid = name.trim().length >= 1 && emailFormatOk && password.length >= 8;
  const { level: pwLevel, score: pwScore } = passwordStrength(password);

  const onCreate = async () => {
    if (!detailsValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await signUp(emailTrim, password, name.trim());
      router.replace("/onboarding");
    } catch (e) {
      setError(
        friendly(e, "Could not create account. Please try again.", {
          "409": "That email is already registered. Please sign in.",
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onBack = () => router.back();

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
          <Pressable
            onPress={onBack}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}
          >
            <Feather name="arrow-left" size={18} color="#FFFFFF" />
          </Pressable>

          <View style={{ marginTop: 28 }}>
            <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 28, lineHeight: 34, letterSpacing: -0.4 }}>
              {"Create your\nBuddyTalk+ account"}
            </Text>
            <Text style={{ color: "#FFFFFF", opacity: 0.85, fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 8, lineHeight: 20 }}>
              Just your email and a password. You can verify your email later from Profile.
            </Text>
          </View>

          <GoogleSignInButton style={{ marginTop: 48 }} />

          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 22, padding: 18, marginTop: 32, gap: 14, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }}>
            <>
                <Field icon="user" label="Your name" value={name} onChangeText={setName} placeholder="e.g. Aisha" autoCapitalize="words" />

                <View>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#5C5680", marginBottom: 6, letterSpacing: 0.3 }}>EMAIL</Text>
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

                <View style={{ gap: 8 }}>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#5C5680", marginBottom: 2, letterSpacing: 0.3 }}>PASSWORD</Text>
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
                  label={submitting ? "Creating account..." : "Create account"}
                  icon="check"
                  onPress={onCreate}
                  disabled={!detailsValid || submitting}
                  loading={submitting}
                  fullWidth
                  size="lg"
                />
              </>

          </View>

          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 22, gap: 6 }}>
            <Text style={{ color: "#5C5680", fontFamily: "Inter_500Medium", fontSize: 14 }}>Already have an account?</Text>
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
