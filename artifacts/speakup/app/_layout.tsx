import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { IncomingCallOverlay } from "@/components/IncomingCallOverlay";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import { configureApiClient } from "@/lib/apiSetup";

SplashScreen.preventAutoHideAsync();

configureApiClient();

const queryClient = new QueryClient();

function NavigationGate() {
  const { user, ready } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (!ready) return;
    const group = segments[0] as string | undefined;
    const inAuth = group === "(auth)";
    const inOnboarding = group === "onboarding";

    if (!user) {
      if (!inAuth) router.replace("/(auth)/welcome");
      return;
    }

    if (!user.onboarded) {
      if (!inOnboarding) router.replace("/onboarding");
    } else if (inAuth || inOnboarding) {
      router.replace("/");
    }
  }, [user, ready, segments]);

  return (
    <>
      <Stack
        screenOptions={{
          headerBackTitle: "Back",
          contentStyle: { backgroundColor: "#F7F5FF" },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen
          name="practice"
          options={{
            presentation: "modal",
            headerShown: false,
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen name="lesson/[id]" options={{ headerShown: true }} />
        <Stack.Screen name="mentor/[id]" options={{ headerShown: true }} />
        <Stack.Screen name="tasks" options={{ headerShown: true }} />
        <Stack.Screen name="become-mentor" options={{ headerShown: true }} />
      </Stack>
      <IncomingCallOverlay />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [timedOut, setTimedOut] = useState(Platform.OS === "web");

  useEffect(() => {
    if (Platform.OS === "web") return;
    const timer = setTimeout(() => setTimedOut(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError || timedOut) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError, timedOut]);

  if (!fontsLoaded && !fontError && !timedOut) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <SocketProvider>
                  <AppProvider>
                    <StatusBar style="auto" />
                    <NavigationGate />
                  </AppProvider>
                </SocketProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
