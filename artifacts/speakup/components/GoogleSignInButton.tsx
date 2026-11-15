import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View, type ViewStyle } from "react-native";

import { useAuth } from "@/context/AuthContext";

const WEB_CLIENT_ID = process.env["EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"] ?? "";
let configured = false;

function loadGoogle(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@react-native-google-signin/google-signin");
  } catch {
    return null;
  }
}

/** "Continue with Google". Shown only on phones whose build includes the Google module and a Web Client ID. */
export function GoogleSignInButton({ style }: { style?: ViewStyle }) {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (Platform.OS !== "web" && !WEB_CLIENT_ID) return null;

  const onPress = async () => {
    if (busy) return;
    setErr(null);
    if (Platform.OS === "web") { setErr("Google sign-in sirf Android app (APK) me chalta hai."); return; }
    const mod = loadGoogle();
    if (!mod) { setErr("Google sign-in is build me available nahi hai. Naya app build install karo."); return; }
    const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = mod;
    setBusy(true);
    try {
      if (!configured) { GoogleSignin.configure({ webClientId: WEB_CLIENT_ID }); configured = true; }
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      try { await GoogleSignin.signOut(); } catch { /* so the account chooser always opens */ }
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return; // user closed the chooser
      const idToken: string | null | undefined = response.data?.idToken;
      if (!idToken) { setErr("Google se token nahi mila. Dobara try karo."); return; }
      await signInWithGoogle(idToken);
      router.replace("/");
    } catch (e: any) {
      if (isErrorWithCode?.(e)) {
        if (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS) return;
        if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) { setErr("Is phone me Google Play Services available nahi hai."); return; }
      }
      setErr(typeof e?.message === "string" && e.message ? e.message : "Google sign-in nahi ho paya. Dobara try karo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={style}>
      <Pressable
        onPress={onPress}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        style={({ pressed }) => ({ height: 52, borderRadius: 16, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, opacity: pressed || busy ? 0.85 : 1, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 })}
      >
        {busy ? (
          <ActivityIndicator color="#4285F4" />
        ) : (
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#F1F3F4", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#4285F4", fontWeight: "900", fontSize: 16 }}>G</Text>
          </View>
        )}
        <Text style={{ color: "#1F1F1F", fontWeight: "700", fontSize: 15.5 }}>Continue with Google</Text>
      </Pressable>
      {err ? <Text style={{ color: "#FFE3E3", fontWeight: "600", fontSize: 12.5, textAlign: "center", marginTop: 8 }}>{err}</Text> : null}
      <Text style={{ color: "#FFFFFF", opacity: 0.8, fontWeight: "600", fontSize: 12.5, textAlign: "center", marginTop: 14 }}>or continue with email</Text>
    </View>
  );
}
