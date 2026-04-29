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

export default function MagicLink() {
  const insets = useSafeAreaInsets();
  const { requestMagicLink, verifyMagicLink } = useAuth();

  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [devToken, setDevToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const sendLink = async () => {
    if (!emailValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await requestMagicLink(email.trim());
      setDevToken(res.devToken);
      setStep("verify");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send link");
    } finally {
      setSubmitting(false);
    }
  };

  const submitToken = async () => {
    if (!token.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await verifyMagicLink(token.trim());
      router.replace("/");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid token";
      setError(msg.includes("401") ? "Link is invalid or expired." : msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F5FF" }}>
      <LinearGradient
        colors={["#3A1F9E", "#5B3DFF", "#FF7A45"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 320 }}
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

          <View style={{ marginTop: 28, alignItems: "center" }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 22,
                backgroundColor: "rgba(255,255,255,0.18)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.3)",
              }}
            >
              <Feather name="mail" size={28} color="#FFFFFF" />
            </View>
            <Text
              style={{
                color: "#FFFFFF",
                fontFamily: "Inter_700Bold",
                fontSize: 26,
                marginTop: 16,
                textAlign: "center",
                letterSpacing: -0.4,
              }}
            >
              {step === "request" ? "Magic link sign-in" : "Enter your code"}
            </Text>
            <Text
              style={{
                color: "#FFFFFF",
                opacity: 0.88,
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                marginTop: 8,
                textAlign: "center",
                paddingHorizontal: 20,
              }}
            >
              {step === "request"
                ? "We'll email you a one-time link. No password needed."
                : `We sent a code to ${email}. Paste it below.`}
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
            {step === "request" ? (
              <>
                <Field
                  icon="mail"
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
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
                  label={submitting ? "Sending…" : "Send me the link"}
                  icon="send"
                  onPress={sendLink}
                  disabled={!emailValid || submitting}
                  loading={submitting}
                  fullWidth
                  size="lg"
                />
              </>
            ) : (
              <>
                {devToken ? (
                  <Pressable onPress={() => setToken(devToken)}>
                    <View
                      style={{
                        backgroundColor: "#FFF1D6",
                        borderRadius: 14,
                        padding: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter_700Bold",
                          fontSize: 11,
                          color: "#7A4A00",
                          letterSpacing: 0.5,
                        }}
                      >
                        DEV ONLY · TAP TO USE
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Inter_500Medium",
                          fontSize: 12,
                          color: "#7A4A00",
                          marginTop: 4,
                          opacity: 0.85,
                        }}
                      >
                        Email sending isn't configured yet — your link token:
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Inter_700Bold",
                          fontSize: 12,
                          color: "#7A4A00",
                          marginTop: 6,
                        }}
                        selectable
                      >
                        {devToken}
                      </Text>
                    </View>
                  </Pressable>
                ) : null}
                <Field
                  icon="key"
                  label="Magic code"
                  value={token}
                  onChangeText={setToken}
                  placeholder="paste from your email"
                  autoCapitalize="none"
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
                  label={submitting ? "Verifying…" : "Continue"}
                  icon="arrow-right"
                  onPress={submitToken}
                  disabled={!token.trim() || submitting}
                  loading={submitting}
                  fullWidth
                  size="lg"
                />
                <Pressable
                  onPress={() => {
                    setStep("request");
                    setToken("");
                    setDevToken(null);
                    setError(null);
                  }}
                  style={{ alignItems: "center", paddingVertical: 4 }}
                >
                  <Text
                    style={{
                      color: "#5B3DFF",
                      fontFamily: "Inter_700Bold",
                      fontSize: 14,
                    }}
                  >
                    Use a different email
                  </Text>
                </Pressable>
              </>
            )}
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
