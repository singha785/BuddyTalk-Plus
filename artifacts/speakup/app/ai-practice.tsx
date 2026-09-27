import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Audio } from "expo-av";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const API_BASE = "http://localhost:8080/api";

type Turn = { speaker: "ai" | "user"; text: string; hindi?: string };

export default function AIPracticeScreen() {
  const { situation: situationParam } = useLocalSearchParams<{ situation?: string }>();
  const situation = typeof situationParam === "string" ? situationParam : "common";
  const insets = useSafeAreaInsets();
  const [started, setStarted] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const loadScenario = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/avatar/scenario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation }),
      });
      const data = await res.json();
      if (!res.ok || !data.turns) throw new Error(data.error || "Failed to load scenario");
      setTurns(data.turns);
      setIndex(0);
    } catch (e: any) {
      setError(e.message || "Could not load scenario");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    setStarted(true);
    // Unlock audio playback on web with a silent primer triggered by user gesture
    try {
      const primer = await Audio.Sound.createAsync(
        { uri: "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA" },
        { shouldPlay: true, volume: 0 },
      );
      await primer.sound.unloadAsync();
    } catch {
      // ignore — some platforms don't need this
    }
    await loadScenario();
  };

  useEffect(() => {
    if (!started || loading || turns.length === 0) return;
    const turn = turns[index];
    if (!turn) return;
    if (turn.speaker === "ai") {
      void playAiTurn(turn.text);
    } else {
      setSpeaking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, loading, turns, started]);

  const playAiTurn = async (text: string) => {
    try {
      setSpeaking(true);
      const res = await fetch(`${API_BASE}/avatar/speech`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true, volume: 1.0 });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setSpeaking(false);
          advance();
        }
      });
    } catch (e) {
      console.error("TTS playback failed", e);
      setSpeaking(false);
    }
  };

  const advance = () => {
    setIndex((i) => (i < turns.length - 1 ? i + 1 : i));
  };

  const isLastTurn = index >= turns.length - 1;
  const currentTurn = turns[index];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: "#1A1530" }}>
        <LinearGradient colors={["#1A1530", "#3A2A66", "#5B3DFF"]} style={StyleSheet.absoluteFill} />
        <View style={{ flex: 1, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24, paddingHorizontal: 20 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }}
          >
            <Feather name="chevron-down" size={20} color="#FFFFFF" />
          </Pressable>


          {!started ? (
            <View style={{ marginTop: 20, alignItems: "center" }}>
              <Pressable
                onPress={handleStart}
                style={{ backgroundColor: "#5B3DFF", borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32 }}
              >
                <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 16 }}>Tap to Start Practice</Text>
              </Pressable>
            </View>
          ) : loading ? (
            <ActivityIndicator color="#FFFFFF" style={{ marginTop: 40 }} />
          ) : error ? (
            <Text style={{ color: "#FF7A45", textAlign: "center", marginTop: 30 }}>{error}</Text>
          ) : currentTurn ? (
            <View style={{ marginTop: 20, backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 18, padding: 18 }}>
              <Text style={{ color: "#5B3DFF", fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 1 }}>
                {currentTurn.speaker === "ai" ? "AI IS SPEAKING" : "YOUR TURN — TRY SAYING"}
              </Text>
              <Text style={{ color: "#1A1530", fontSize: 16, marginTop: 10, lineHeight: 22 }}>
                {currentTurn.text}
              </Text>
              {currentTurn.speaker === "user" && !isLastTurn ? (
                <Pressable
                  onPress={advance}
                  style={{ marginTop: 16, backgroundColor: "#5B3DFF", borderRadius: 14, paddingVertical: 12, alignItems: "center" }}
                >
                  <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold" }}>Next</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </>
  );
}

