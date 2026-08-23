import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
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

export default function ResetPassword() {
  const insets = useSafeAreaInsets();
  const { resetPassword } = useAuth();
  const { email } = useLocalSearchParams<{ email?: string }>();

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const codeReady = code.replace(/\D/g, "").length === 6;
  const passwordsMatch = newPassword === confirmPassword;
  const valid = codeReady && newPassword.length >= 8 && passwordsMatch && !!email;

  const onSubmit = async () => {
    if (!valid || submitting || !email) return;
    if (!passwordsMatch) { setError("Passwords don't match."); return; }
    setSubmitting(true);
    setError(null);
    try {
      await resetPassword(email, code.replace(/\D/g, ""), newPassword);
      setSuccess(true);
      setTimeout(() => router.replace("/"), 1500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("invalid_code") || msg.includes("401")) {
        setError("That code is incorrect or expired. Please request a new one.");
      } else if (e instanceof TypeError || msg.includes("fetch failed")) {
        setError("Can't reach the server. Check your connection.");
      } else {
        setError(msg || "Could not reset password. Please try again.");
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
              Choose a new{"\n"}password
            </Text>
            <Text style={{ color: "#FFFFFF", opacity: 0.85, fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 8 }}>
              Enter the 6-digit code from your email{email ? ` (${email})` : ""}.
            </Text>
          </View>

          {success ? (
            <View style={{ backgroundColor: "#DDF5EE", borderRadius: 22, padding: 24, marginTop: 32, alignItems: "center", gap: 12 }}>
              <Feather name="check-circle" size={40} color="#0E6F5A" />
              <Text style={{ color: "#0E6F5A", fontFamily: "Inter_700Bold", fontSize: 18, textAlign: "center" }}>
                Password changed!
              </Text>
              <Text style={{ color: "#0E6F5A", fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" }}>
                Signing you in…
              </Text>
            </View>
          ) : (
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 22, padding: 18, marginTop: 32, gap: 16, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }}>

              {/* Code input */}
              <View>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#5C5680", marginBottom: 6, letterSpacing: 0.3 }}>
                  RESET CODE
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F4F2FB", borderRadius: 14, paddingHorizontal: 14, height: 52 }}>
                  <Feather name="hash" size={16} color="#5C5680" />
                  <TextInput
                    value={code}
                    onChangeText={(v) => { setCode(v.replace(/\D/g, "").slice(0, 6)); setError(null); }}
                    placeholder="6-digit code"
                    placeholderTextColor="#9C97B8"
                    keyboardType="number-pad"
                    maxLength={6}
                    style={{ flex: 1, fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: 4, color: "#1A1530" }}
                  />
                  {codeReady && <Feather name="check-circle" size={16} color="#16A085" />}
                </View>
              </View>

              {/* New password */}
              <PasswordField
                label="New password"
                value={newPassword}
                onChangeText={(v) => { setNewPassword(v); setError(null); }}
                placeholder="at least 8 characters"
                show={showNew}
                onToggle={() => setShowNew((s) => !s)}
              />

              {/* Confirm password */}
              <View>
                <PasswordField
                  label="Confirm password"
                  value={confirmPassword}
                  onChangeText={(v) => { setConfirmPassword(v); setError(null); }}
                  placeholder="repeat new password"
                  show={showConfirm}
                  onToggle={() => setShowConfirm((s) => !s)}
                />
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <Text style={{ color: "#E5484D", fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4 }}>
                    Passwords don't match
                  </Text>
                )}
              </View>

              {error && <Text style={{ color: "#B0181F", fontFamily: "Inter_500Medium", fontSize: 13 }}>{error}</Text>}

              <Button
                label={submitting ? "Saving…" : "Set new password"}
                icon="check"
                onPress={onSubmit}
                disabled={!valid || submitting}
                loading={submitting}
                fullWidth
                size="lg"
              />

              <Pressable onPress={() => router.push("/(auth)/forgot-password")} style={{ alignItems: "center", paddingVertical: 4 }}>
                <Text style={{ color: "#5B3DFF", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                  Didn't get a code? Request a new one
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function PasswordField({
  label, value, onChangeText, placeholder, show, onToggle,
}: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; show: boolean; onToggle: () => void }) {
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
          autoComplete="new-password"
          style={{ flex: 1, fontFamily: "Inter_500Medium", fontSize: 15, color: "#1A1530" }}
        />
        <RNPressable onPress={onToggle} hitSlop={10}>
          <Feather name={show ? "eye-off" : "eye"} size={18} color="#9C97B8" />
        </RNPressable>
      </View>
    </View>
  );
}
