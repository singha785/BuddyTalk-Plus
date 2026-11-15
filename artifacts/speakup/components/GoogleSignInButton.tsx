import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

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
          <Svg width={24} height={24} viewBox="0 0 48 48">
            <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </Svg>
        )}
        <Text style={{ color: "#1F1F1F", fontWeight: "700", fontSize: 15.5 }}>Continue with Google</Text>
      </Pressable>
      {err ? <Text style={{ color: "#FFE3E3", fontWeight: "600", fontSize: 12.5, textAlign: "center", marginTop: 8 }}>{err}</Text> : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.45)" }} />
        <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>or</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.45)" }} />
      </View>
    </View>
  );
}
