import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSocket, type IncomingCallData } from "@/context/SocketContext";

const RING_TIMEOUT_MS = 30_000;

export function IncomingCallOverlay() {
  const socket = useSocket();
  const insets = useSafeAreaInsets();
  const [callData, setCallData] = useState<IncomingCallData | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  const slideIn = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    const offIncoming = socket.onIncomingCall((data) => {
      setCallData(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);

      // Slide in
      Animated.spring(slideIn, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }).start();

      // Auto-reject after timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (data) socket.rejectIncomingCall(data.callId);
        dismiss();
      }, RING_TIMEOUT_MS);
    });

    const offCancelled = socket.onCallCancelled(() => dismiss());

    return () => {
      offIncoming();
      offCancelled();
    };
  }, [socket]);

  useEffect(() => {
    if (!callData) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [callData, pulse]);

  const dismiss = () => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    Animated.timing(slideIn, { toValue: -200, duration: 250, useNativeDriver: true }).start(() => {
      setCallData(null);
      slideIn.setValue(-200);
    });
  };

  const handleAccept = () => {
    if (!callData) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    socket.acceptIncomingCall(callData.callId);
    dismiss();
    router.push("/practice?mode=incoming");
  };

  const handleReject = () => {
    if (!callData) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    socket.rejectIncomingCall(callData.callId);
    dismiss();
  };

  if (!callData) return null;

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });
  const initials = (callData.callerName ?? "?").substring(0, 2).toUpperCase();

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top + (Platform.OS === "web" ? 67 : 10), transform: [{ translateY: slideIn }] },
      ]}
      pointerEvents="box-none"
    >
      <LinearGradient
        colors={["#1A1530", "#3A2A66"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Caller info */}
        <View style={styles.callerRow}>
          <View style={{ alignItems: "center", justifyContent: "center", width: 60, height: 60 }}>
            <Animated.View style={[styles.pulseBg, { backgroundColor: callData.callerColor, transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
            <View style={[styles.avatar, { backgroundColor: callData.callerColor }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.incomingLabel}>Incoming call</Text>
            <Text style={styles.callerName} numberOfLines={1}>{callData.callerName}</Text>
            <Text style={styles.callerMeta} numberOfLines={1}>
              {callData.callerRegion}{callData.callerLevel ? ` · ${callData.callerLevel}` : ""}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <Pressable
            onPress={handleReject}
            style={({ pressed }) => [styles.actionBtn, styles.rejectBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="phone-off" size={22} color="#FFFFFF" />
            <Text style={styles.actionLabel}>Decline</Text>
          </Pressable>
          <Pressable
            onPress={handleAccept}
            style={({ pressed }) => [styles.actionBtn, styles.acceptBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="phone-call" size={22} color="#FFFFFF" />
            <Text style={styles.actionLabel}>Accept</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  card: {
    borderRadius: 28,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  callerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pulseBg: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  incomingLabel: {
    color: "#FFFFFF",
    opacity: 0.65,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  callerName: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginTop: 2,
  },
  callerMeta: {
    color: "#FFFFFF",
    opacity: 0.7,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 999,
  },
  rejectBtn: {
    backgroundColor: "#E5484D",
  },
  acceptBtn: {
    backgroundColor: "#16A085",
  },
  actionLabel: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
});
