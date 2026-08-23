import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable as RNPressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/Card";
import { CoinBadge } from "@/components/CoinBadge";
import { Pressable } from "@/components/Pressable";
import { ProgressBar } from "@/components/ProgressBar";
import { useApp } from "@/context/AppContext";
import { DAILY_TASKS, type DailyTask } from "@/data/tasks";
import { useColors } from "@/hooks/useColors";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

// ── Data for task overlays ───────────────────────────────────────────────────

const LISTEN_PHRASES = [
  "The weather is lovely today, isn't it?",
  "I've been learning English for three months.",
  "Could you please speak a little more slowly?",
];

interface VocabItem { word: string; correct: string; wrong: [string, string]; }

const VOCAB_ITEMS: VocabItem[] = [
  { word: "Ambitious",    correct: "Having a strong desire to succeed",      wrong: ["Feeling tired and lazy",        "Being very quiet"] },
  { word: "Accomplish",   correct: "To successfully complete something",      wrong: ["To fail at a task",             "To forget something"] },
  { word: "Communicate",  correct: "To share information or ideas",           wrong: ["To stay completely silent",     "To hide your feelings"] },
  { word: "Confident",    correct: "Having strong belief in yourself",        wrong: ["Feeling very afraid",           "Being unsure of everything"] },
  { word: "Determine",    correct: "To decide something firmly",              wrong: ["To give up easily",             "To ignore a problem"] },
  { word: "Enthusiastic", correct: "Having great excitement and energy",      wrong: ["Feeling bored and tired",       "Being worried about things"] },
  { word: "Fluent",       correct: "Able to speak easily and smoothly",       wrong: ["Unable to understand others",   "Speaking very slowly"] },
  { word: "Genuine",      correct: "Real and true, not fake",                 wrong: ["Made of cheap material",        "Copied from someone else"] },
  { word: "Hesitate",     correct: "To pause before speaking or acting",      wrong: ["To rush into things quickly",   "To shout very loudly"] },
  { word: "Impressive",   correct: "Causing admiration and respect",          wrong: ["Looking plain and simple",      "Being completely forgettable"] },
];

function shuffleOptions(item: VocabItem): string[] {
  const opts = [item.correct, item.wrong[0], item.wrong[1]];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}

const TONGUE_TWISTER =
  "She sells seashells by the seashore, and the shells she sells are seashells.";
const TWISTER_REQUIRED = 3;
const HOLD_DURATION_MS = 3500; // ms to hold mic button on native (no speech API)
const SELF_INTRO_MIN_WORDS = 15;

// ── Icon / colour maps ───────────────────────────────────────────────────────

const TYPE_ICONS: Record<DailyTask["type"], React.ComponentProps<typeof Feather>["name"]> = {
  speak: "mic", listen: "headphones", learn: "book-open", talk: "phone-call",
};
const TYPE_BG: Record<DailyTask["type"], string> = {
  speak: "#EAE2FF", listen: "#FFE9DD", learn: "#FFF1D6", talk: "#DDF5EE",
};
const TYPE_FG: Record<DailyTask["type"], string> = {
  speak: "#5B3DFF", listen: "#A93D00", learn: "#7A4A00", talk: "#0E6F5A",
};

// ── TasksScreen ──────────────────────────────────────────────────────────────

export default function TasksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, completeTask } = useApp();

  // ── Self-intro state ─────────────────────────────────────────────────────
  const [introOpen, setIntroOpen] = useState(false);
  const [introActive, setIntroActive] = useState(false);
  const [introText, setIntroText] = useState("");
  const [introStartTime, setIntroStartTime] = useState<number | null>(null);
  const introActiveRef = useRef(false);
  const accRef = useRef("");
  const micPulse = useRef(new Animated.Value(0)).current;

  const introWords = introText.trim().split(/\s+/).filter(Boolean).length;
  const introReady = introWords >= SELF_INTRO_MIN_WORDS;
  const introDurationSec = introStartTime ? Math.max(1, (Date.now() - introStartTime) / 1000) : 1;
  const introWPM = Math.round((introWords / introDurationSec) * 60);

  // ── Listen-and-repeat state ──────────────────────────────────────────────
  const [listenOpen, setListenOpen] = useState(false);
  const [listenPhraseIdx, setListenPhraseIdx] = useState(0);
  const [listenDone, setListenDone] = useState([false, false, false]);
  const [listenRecording, setListenRecording] = useState(false);
  const [listenFeedback, setListenFeedback] = useState<string | null>(null);
  const listenPhraseIdxRef = useRef(0);
  useEffect(() => { listenPhraseIdxRef.current = listenPhraseIdx; }, [listenPhraseIdx]);

  // ── Vocab quiz state ─────────────────────────────────────────────────────
  const [wordsOpen, setWordsOpen] = useState(false);
  const [wordIdx, setWordIdx] = useState(0);
  const [wordSelected, setWordSelected] = useState<string | null>(null);
  const [wordPhase, setWordPhase] = useState<"quiz" | "feedback">("quiz");
  const [wordCorrectCount, setWordCorrectCount] = useState(0);
  const [quizOptions] = useState<string[][]>(() => VOCAB_ITEMS.map(shuffleOptions));

  // ── Tongue-twister state ─────────────────────────────────────────────────
  const [twisterOpen, setTwisterOpen] = useState(false);
  const [twisterAttempts, setTwisterAttempts] = useState(0);
  const [twisterRecording, setTwisterRecording] = useState(false);
  const [twisterFeedback, setTwisterFeedback] = useState<string | null>(null);

  // ── Hold-to-record (native fallback) ─────────────────────────────────────
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef(0);
  const holdCompleteRef = useRef<(() => void) | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const taskTargetRef = useRef<"listen" | "twister" | null>(null);

  // ── Speech recognition — self-intro ──────────────────────────────────────
  const onIntroResult = useCallback((text: string) => {
    if (!text.trim()) return;
    const next = accRef.current ? `${accRef.current} ${text}` : text;
    accRef.current = next;
    setIntroText(next);
  }, []);
  const introSpeech = useSpeechRecognition(onIntroResult);

  // ── Speech recognition — task overlays (listen + twister) ────────────────
  const onTaskSpeechResult = useCallback((text: string) => {
    const target = taskTargetRef.current;
    if (target === "listen") {
      const msg = text.trim()
        ? `"${text.slice(0, 80)}${text.length > 80 ? "…" : ""}"`
        : "Speech detected ✓";
      setListenFeedback(msg);
      setListenDone(prev => {
        const next = [...prev];
        next[listenPhraseIdxRef.current] = true;
        return next;
      });
      setListenRecording(false);
    } else if (target === "twister") {
      setTwisterFeedback("Attempt recorded ✓");
      setTwisterAttempts(prev => Math.min(prev + 1, TWISTER_REQUIRED));
      setTwisterRecording(false);
    }
  }, []);
  const taskSpeech = useSpeechRecognition(onTaskSpeechResult);

  // Clear recording flags when speech recognition stops
  useEffect(() => {
    if (!taskSpeech.listening) {
      setListenRecording(false);
      setTwisterRecording(false);
    }
  }, [taskSpeech.listening]);

  // ── Greeting micro-feedback animation (Task 1) ────────────────────────────
  const greetCount = state.greetedPartners.length;
  const prevGreetRef = useRef(greetCount);
  const [greetFlash, setGreetFlash] = useState(false);
  const greetFlashOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (greetCount > prevGreetRef.current) {
      prevGreetRef.current = greetCount;
      setGreetFlash(true);
      Animated.sequence([
        Animated.timing(greetFlashOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(2200),
        Animated.timing(greetFlashOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => setGreetFlash(false));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
  }, [greetCount, greetFlashOpacity]);

  // ── Mic pulse animation (self-intro) ─────────────────────────────────────
  useEffect(() => {
    if (!introActive) { micPulse.setValue(0); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(micPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(micPulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [introActive, micPulse]);

  useEffect(() => { introActiveRef.current = introActive; }, [introActive]);

  useEffect(() => {
    if (!introActive || introSpeech.listening || introReady) return;
    const t = setTimeout(() => { if (introActiveRef.current) introSpeech.startListening(); }, 400);
    return () => clearTimeout(t);
  }, [introActive, introSpeech.listening, introReady, introSpeech]);

  // ── Self-intro actions ───────────────────────────────────────────────────
  const startIntroRecording = () => {
    setIntroText(""); accRef.current = "";
    setIntroStartTime(Date.now());
    setIntroActive(true);
    introSpeech.startListening();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  };
  const stopIntroRecording = () => {
    setIntroActive(false);
    introSpeech.stopListening();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };
  const closeIntro = () => { stopIntroRecording(); setIntroOpen(false); };
  const completeIntroTask = async () => {
    await completeTask("task-self-intro", 10);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    closeIntro();
  };

  // ── Hold-to-record helpers ────────────────────────────────────────────────
  const startHoldRecord = (onComplete: () => void) => {
    cancelHoldRecord();
    setHoldProgress(0);
    holdStartRef.current = Date.now();
    holdCompleteRef.current = onComplete;
    holdTimerRef.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - holdStartRef.current) / HOLD_DURATION_MS) * 100);
      setHoldProgress(pct);
      if (pct >= 100) {
        cancelHoldRecord();
        onComplete();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      }
    }, 50);
  };
  const cancelHoldRecord = () => {
    if (holdTimerRef.current) { clearInterval(holdTimerRef.current); holdTimerRef.current = null; }
    setHoldProgress(0);
    holdCompleteRef.current = null;
  };

  // ── Listen-and-repeat actions ─────────────────────────────────────────────
  const startListenRecording = () => {
    taskTargetRef.current = "listen";
    setListenFeedback(null);
    if (taskSpeech.supported) {
      setListenRecording(true);
      taskSpeech.reset();
      taskSpeech.startListening();
    } else {
      startHoldRecord(() => {
        setListenFeedback("Recorded ✓");
        setListenDone(prev => { const n = [...prev]; n[listenPhraseIdxRef.current] = true; return n; });
      });
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  };
  const advanceListenPhrase = () => {
    if (listenPhraseIdx < LISTEN_PHRASES.length - 1) {
      setListenPhraseIdx(p => p + 1);
      setListenFeedback(null);
    }
  };
  const closeListenOverlay = () => {
    taskSpeech.stopListening(); cancelHoldRecord();
    setListenOpen(false); setListenPhraseIdx(0);
    setListenDone([false, false, false]); setListenFeedback(null); setListenRecording(false);
  };
  const completeListenTask = async () => {
    await completeTask("task-listen-podcast", 8);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    closeListenOverlay();
  };

  // ── Vocab quiz actions ────────────────────────────────────────────────────
  const openWordsOverlay = () => {
    setWordIdx(0); setWordSelected(null);
    setWordPhase("quiz"); setWordCorrectCount(0); setWordsOpen(true);
  };
  const handleWordSelect = (option: string) => {
    if (wordPhase !== "quiz") return;
    setWordSelected(option); setWordPhase("feedback");
    if (option === VOCAB_ITEMS[wordIdx].correct) {
      setWordCorrectCount(p => p + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    }
  };
  const advanceWord = () => {
    if (wordIdx < VOCAB_ITEMS.length - 1) {
      setWordIdx(p => p + 1); setWordSelected(null); setWordPhase("quiz");
    }
  };
  const completeWordsTask = async () => {
    await completeTask("task-learn-words", 6);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setWordsOpen(false);
  };

  // ── Tongue-twister actions ────────────────────────────────────────────────
  const openTwisterOverlay = () => {
    setTwisterAttempts(0); setTwisterFeedback(null); setTwisterRecording(false); setTwisterOpen(true);
  };
  const startTwisterRecording = () => {
    taskTargetRef.current = "twister";
    setTwisterFeedback(null);
    if (taskSpeech.supported) {
      setTwisterRecording(true); taskSpeech.reset(); taskSpeech.startListening();
    } else {
      startHoldRecord(() => {
        setTwisterFeedback("Attempt recorded ✓");
        setTwisterAttempts(p => Math.min(p + 1, TWISTER_REQUIRED));
      });
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  };
  const closeTwisterOverlay = () => {
    taskSpeech.stopListening(); cancelHoldRecord();
    setTwisterOpen(false); setTwisterAttempts(0); setTwisterFeedback(null); setTwisterRecording(false);
  };
  const completeTwisterTask = async () => {
    await completeTask("task-tongue-twister", 5);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    closeTwisterOverlay();
  };

  // ── Generic fallback (shouldn't be reached now) ───────────────────────────
  const onComplete = async (t: DailyTask) => {
    await completeTask(t.id, t.reward);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const total = DAILY_TASKS.length;
  const done = DAILY_TASKS.filter(t => state.completedTasks.includes(t.id)).length;
  const pct = Math.round((done / total) * 100);

  const listenAllDone = listenDone.every(Boolean);
  const twisterDone = twisterAttempts >= TWISTER_REQUIRED;
  const quizDone = wordIdx === VOCAB_ITEMS.length - 1 && wordPhase === "feedback";

  const micScale = micPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] });
  const micOpacity = micPulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  // Task press handler
  const handlePress = (t: DailyTask) => {
    if (t.id === "task-greet-5" || t.id === "task-real-talk") { router.push("/practice"); return; }
    if (t.id === "task-self-intro") { setIntroOpen(true); return; }
    if (t.id === "task-listen-podcast") {
      setListenPhraseIdx(0); setListenDone([false, false, false]); setListenFeedback(null); setListenOpen(true); return;
    }
    if (t.id === "task-learn-words") { openWordsOverlay(); return; }
    if (t.id === "task-tongue-twister") { openTwisterOverlay(); return; }
    void onComplete(t);
  };

  // Shared overlay base style
  const overlayBase = {
    position: "absolute" as const, inset: 0, zIndex: 100,
    backgroundColor: "rgba(26,21,48,0.97)",
    paddingTop: insets.top + (Platform.OS === "web" ? 72 : 24),
    paddingBottom: insets.bottom + 32,
    paddingHorizontal: 24,
  };

  return (
    <>
      <Stack.Screen options={{
        title: "Daily tasks",
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontFamily: "Inter_700Bold" },
      }} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>

        {/* ── Greeting flash banner (Task 1 micro-feedback) ──────────────── */}
        {greetFlash && (
          <Animated.View style={{
            position: "absolute", top: 0, left: 0, right: 0, zIndex: 200,
            opacity: greetFlashOpacity,
            backgroundColor: "#DDF5EE",
            paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 20,
            flexDirection: "row", alignItems: "center", gap: 10,
          }}>
            <Feather name="star" size={18} color="#0E6F5A" />
            <Text style={{ color: "#0E6F5A", fontFamily: "Inter_700Bold", fontSize: 14 }}>
              Nice greeting! {greetCount}/5 toward your goal
            </Text>
          </Animated.View>
        )}

        {/* ════════════════════ Self-intro overlay ═══════════════════════════ */}
        {introOpen && (
          <View style={{ ...overlayBase, justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 20 }}>Self-introduction</Text>
              <RNPressable onPress={closeIntro} hitSlop={12} style={S.closeBtn}>
                <Feather name="x" size={18} color="#FFFFFF" />
              </RNPressable>
            </View>
            <View style={{ alignItems: "center", flex: 1, justifyContent: "center", gap: 28 }}>
              <Text style={{ color: "#FFFFFF", opacity: 0.75, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 22 }}>
                Speak about yourself — name, where you're from, what you do, and hobbies. Keep going until the counter reaches {SELF_INTRO_MIN_WORDS} words.
              </Text>
              <View style={{ alignItems: "center", justifyContent: "center", width: 120, height: 120 }}>
                {introActive && (
                  <Animated.View style={{ position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: "#5B3DFF", opacity: micOpacity, transform: [{ scale: micScale }] }} />
                )}
                <RNPressable
                  onPress={introActive ? stopIntroRecording : startIntroRecording}
                  style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: introActive ? "#5B3DFF" : "rgba(91,61,255,0.25)", borderWidth: 2, borderColor: "#5B3DFF", alignItems: "center", justifyContent: "center" }}
                >
                  <Feather name={introActive ? "mic" : "mic-off"} size={34} color={introActive ? "#FFFFFF" : "#9B8FFF"} />
                </RNPressable>
              </View>
              <View style={{ alignItems: "center", gap: 6 }}>
                <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 40 }}>{introWords}</Text>
                <Text style={{ color: "#FFFFFF", opacity: 0.6, fontFamily: "Inter_500Medium", fontSize: 14 }}>
                  {introReady ? `✓ Ready  ·  ~${introWPM} wpm` : `words spoken (need ${SELF_INTRO_MIN_WORDS})`}
                </Text>
                {introReady && (
                  <Text style={{ color: "#34D27D", fontFamily: "Inter_500Medium", fontSize: 12, textAlign: "center" }}>
                    {introWPM >= 120 ? "Excellent pace — clear and natural!" : introWPM >= 80 ? "Good rhythm — steady and easy to follow." : "Nice pace — keep practising for a faster flow."}
                  </Text>
                )}
              </View>
              {introText.length > 0 && (
                <View style={{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 16, width: "100%" }}>
                  <Text style={{ color: "#FFFFFF", opacity: 0.8, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 }} numberOfLines={4}>
                    "{introText}"
                  </Text>
                </View>
              )}
              {introSpeech.error && <Text style={S.errTxt}>{introSpeech.error}</Text>}
              {!introSpeech.supported && <Text style={S.errTxt}>Speech recognition is not supported on this browser. Try Chrome or Edge.</Text>}
            </View>
            <View style={{ gap: 12 }}>
              {introReady && (
                <RNPressable onPress={() => { void completeIntroTask(); }} style={S.greenBtn}>
                  <Text style={S.greenBtnTxt}>Complete task (+10 coins)</Text>
                </RNPressable>
              )}
              <RNPressable
                onPress={introActive ? stopIntroRecording : startIntroRecording}
                style={{ backgroundColor: introActive ? "rgba(229,72,77,0.2)" : "rgba(91,61,255,0.2)", paddingVertical: 14, borderRadius: 16, alignItems: "center" }}
              >
                <Text style={{ color: introActive ? "#E5484D" : "#9B8FFF", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                  {introActive ? "Pause recording" : "Start recording"}
                </Text>
              </RNPressable>
            </View>
          </View>
        )}

        {/* ════════════════════ Listen-and-repeat overlay ═════════════════════ */}
        {listenOpen && (
          <View style={{ ...overlayBase, justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View>
                <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 20 }}>Listen &amp; Repeat</Text>
                <Text style={{ color: "#FFFFFF", opacity: 0.5, fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 2 }}>
                  Phrase {listenPhraseIdx + 1} of {LISTEN_PHRASES.length}
                </Text>
              </View>
              <RNPressable onPress={closeListenOverlay} hitSlop={12} style={S.closeBtn}>
                <Feather name="x" size={18} color="#FFFFFF" />
              </RNPressable>
            </View>

            {/* Progress dots */}
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 12 }}>
              {LISTEN_PHRASES.map((_, i) => (
                <View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: listenDone[i] ? "#34D27D" : i === listenPhraseIdx ? "#5B3DFF" : "rgba(255,255,255,0.2)" }} />
              ))}
            </View>

            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 20 }}>
              {/* Phrase card */}
              <View style={{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 20, padding: 24, width: "100%" }}>
                <Text style={{ color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 18, textAlign: "center", lineHeight: 28 }}>
                  "{LISTEN_PHRASES[listenPhraseIdx]}"
                </Text>
              </View>

              {/* Feedback */}
              {listenFeedback ? (
                <View style={{ backgroundColor: "rgba(52,210,125,0.15)", borderRadius: 14, padding: 14, width: "100%", flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Feather name="check-circle" size={18} color="#34D27D" />
                  <Text style={{ color: "#34D27D", fontFamily: "Inter_500Medium", fontSize: 14, flex: 1 }} numberOfLines={2}>{listenFeedback}</Text>
                </View>
              ) : listenRecording ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#E5484D" }} />
                  <Text style={{ color: "#FFFFFF", opacity: 0.75, fontFamily: "Inter_500Medium", fontSize: 14 }}>Listening… say the phrase aloud</Text>
                </View>
              ) : taskSpeech.error ? (
                <Text style={S.errTxt}>{taskSpeech.error} — tap mic to try again</Text>
              ) : null}

              {/* Hold progress bar (native fallback) */}
              {!taskSpeech.supported && holdProgress > 0 && holdProgress < 100 && taskTargetRef.current === "listen" && (
                <View style={{ width: "100%", height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden", flexDirection: "row" }}>
                  <View style={{ flex: holdProgress, height: 6, backgroundColor: "#5B3DFF" }} />
                  <View style={{ flex: 100 - holdProgress, height: 6 }} />
                </View>
              )}

              {/* Mic button */}
              {!listenDone[listenPhraseIdx] && (
                <RNPressable
                  onPress={taskSpeech.supported ? startListenRecording : undefined}
                  onPressIn={!taskSpeech.supported ? () => startHoldRecord(() => {
                    setListenFeedback("Recorded ✓");
                    setListenDone(prev => { const n = [...prev]; n[listenPhraseIdxRef.current] = true; return n; });
                  }) : undefined}
                  onPressOut={!taskSpeech.supported ? cancelHoldRecord : undefined}
                  disabled={listenRecording}
                  style={[S.micBtn, { backgroundColor: listenRecording ? "#5B3DFF" : "rgba(91,61,255,0.25)" }]}
                >
                  <Feather name={listenRecording ? "mic" : "mic-off"} size={30} color={listenRecording ? "#FFFFFF" : "#9B8FFF"} />
                </RNPressable>
              )}

              <Text style={S.hint}>
                {taskSpeech.supported ? "Tap the mic and say the phrase aloud" : "Press and hold the mic button (3.5 sec) to record"}
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              {listenAllDone ? (
                <RNPressable onPress={() => { void completeListenTask(); }} style={S.greenBtn}>
                  <Text style={S.greenBtnTxt}>Complete task (+8 coins)</Text>
                </RNPressable>
              ) : listenDone[listenPhraseIdx] && listenPhraseIdx < LISTEN_PHRASES.length - 1 ? (
                <RNPressable onPress={advanceListenPhrase} style={S.purpleBtn}>
                  <Text style={S.purpleBtnTxt}>Next phrase →</Text>
                </RNPressable>
              ) : null}
              <RNPressable onPress={closeListenOverlay} style={{ paddingVertical: 12, alignItems: "center" }}>
                <Text style={{ color: "rgba(255,255,255,0.35)", fontFamily: "Inter_500Medium", fontSize: 14 }}>Cancel</Text>
              </RNPressable>
            </View>
          </View>
        )}

        {/* ════════════════════ Vocab quiz overlay ════════════════════════════ */}
        {wordsOpen && (
          <View style={{ ...overlayBase, justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View>
                <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 20 }}>Word Quiz</Text>
                <Text style={{ color: "#FFFFFF", opacity: 0.5, fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 2 }}>
                  Word {wordIdx + 1} of {VOCAB_ITEMS.length} · {wordCorrectCount} correct
                </Text>
              </View>
              <RNPressable onPress={() => setWordsOpen(false)} hitSlop={12} style={S.closeBtn}>
                <Feather name="x" size={18} color="#FFFFFF" />
              </RNPressable>
            </View>

            {/* Progress dots */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 12 }}>
              {VOCAB_ITEMS.map((_, i) => (
                <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i < wordIdx ? "#34D27D" : i === wordIdx ? "#5B3DFF" : "rgba(255,255,255,0.2)" }} />
              ))}
            </View>

            <View style={{ flex: 1, justifyContent: "center", gap: 16 }}>
              <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 36, textAlign: "center", letterSpacing: -0.5 }}>
                {VOCAB_ITEMS[wordIdx].word}
              </Text>
              <Text style={{ color: "#FFFFFF", opacity: 0.45, fontFamily: "Inter_500Medium", fontSize: 14, textAlign: "center" }}>
                What does this word mean?
              </Text>
              <View style={{ gap: 10, marginTop: 4 }}>
                {quizOptions[wordIdx].map((opt) => {
                  const isCorrect = opt === VOCAB_ITEMS[wordIdx].correct;
                  const isSelected = wordSelected === opt;
                  const showResult = wordPhase === "feedback";
                  let bg = "rgba(255,255,255,0.08)";
                  let border = "rgba(255,255,255,0.14)";
                  if (showResult && isCorrect) { bg = "rgba(52,210,125,0.22)"; border = "#34D27D"; }
                  else if (showResult && isSelected && !isCorrect) { bg = "rgba(229,72,77,0.22)"; border = "#E5484D"; }
                  return (
                    <RNPressable key={opt} onPress={() => handleWordSelect(opt)} disabled={wordPhase === "feedback"}
                      style={{ backgroundColor: bg, borderWidth: 1.5, borderColor: border, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 }}
                    >
                      {showResult && isCorrect && <Feather name="check-circle" size={16} color="#34D27D" />}
                      {showResult && isSelected && !isCorrect && <Feather name="x-circle" size={16} color="#E5484D" />}
                      <Text style={{ color: "#FFFFFF", fontFamily: isSelected ? "Inter_600SemiBold" : "Inter_400Regular", fontSize: 15, flex: 1 }}>{opt}</Text>
                    </RNPressable>
                  );
                })}
              </View>
              {wordPhase === "feedback" && wordSelected && (
                <Text style={{ textAlign: "center", fontFamily: "Inter_500Medium", fontSize: 14, color: wordSelected === VOCAB_ITEMS[wordIdx].correct ? "#34D27D" : "#FF7A45" }}>
                  {wordSelected === VOCAB_ITEMS[wordIdx].correct ? "Correct! Well done." : `Not quite — the answer is: "${VOCAB_ITEMS[wordIdx].correct}"`}
                </Text>
              )}
            </View>

            <View style={{ gap: 10 }}>
              {quizDone ? (
                <RNPressable onPress={() => { void completeWordsTask(); }} style={S.greenBtn}>
                  <Text style={S.greenBtnTxt}>Complete task (+6 coins)  ·  {wordCorrectCount}/{VOCAB_ITEMS.length} correct</Text>
                </RNPressable>
              ) : wordPhase === "feedback" ? (
                <RNPressable onPress={advanceWord} style={S.purpleBtn}>
                  <Text style={S.purpleBtnTxt}>Next word →</Text>
                </RNPressable>
              ) : null}
            </View>
          </View>
        )}

        {/* ════════════════════ Tongue-twister overlay ════════════════════════ */}
        {twisterOpen && (
          <View style={{ ...overlayBase, justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 20 }}>Tongue Twister</Text>
              <RNPressable onPress={closeTwisterOverlay} hitSlop={12} style={S.closeBtn}>
                <Feather name="x" size={18} color="#FFFFFF" />
              </RNPressable>
            </View>

            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 24 }}>
              {/* Twister text */}
              <View style={{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 20, padding: 24, width: "100%" }}>
                <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 17, textAlign: "center", lineHeight: 28 }}>
                  "{TONGUE_TWISTER}"
                </Text>
              </View>

              {/* Attempt circles */}
              <View style={{ alignItems: "center", gap: 10 }}>
                <Text style={{ color: "#FFFFFF", opacity: 0.55, fontFamily: "Inter_500Medium", fontSize: 14 }}>
                  Say it 3 times fast · {twisterAttempts}/{TWISTER_REQUIRED} recorded
                </Text>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {Array.from({ length: TWISTER_REQUIRED }).map((_, i) => (
                    <View key={i} style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: i < twisterAttempts ? "#34D27D" : "rgba(255,255,255,0.2)", borderWidth: i === twisterAttempts ? 2 : 0, borderColor: "#5B3DFF" }} />
                  ))}
                </View>
              </View>

              {/* Feedback */}
              {twisterFeedback ? (
                <View style={{ backgroundColor: "rgba(52,210,125,0.15)", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Feather name="check-circle" size={16} color="#34D27D" />
                  <Text style={{ color: "#34D27D", fontFamily: "Inter_500Medium", fontSize: 14 }}>{twisterFeedback}</Text>
                </View>
              ) : twisterRecording ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#E5484D" }} />
                  <Text style={{ color: "#FFFFFF", opacity: 0.75, fontFamily: "Inter_500Medium", fontSize: 14 }}>Listening…</Text>
                </View>
              ) : taskSpeech.error ? (
                <Text style={S.errTxt}>{taskSpeech.error} — tap mic to try again</Text>
              ) : null}

              {/* Hold progress (native) */}
              {!taskSpeech.supported && holdProgress > 0 && holdProgress < 100 && taskTargetRef.current === "twister" && (
                <View style={{ width: "70%", height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden", flexDirection: "row" }}>
                  <View style={{ flex: holdProgress, height: 6, backgroundColor: "#5B3DFF" }} />
                  <View style={{ flex: 100 - holdProgress, height: 6 }} />
                </View>
              )}

              {/* Mic button */}
              {!twisterDone && (
                <RNPressable
                  onPress={taskSpeech.supported ? startTwisterRecording : undefined}
                  onPressIn={!taskSpeech.supported ? () => startHoldRecord(() => {
                    setTwisterFeedback("Attempt recorded ✓");
                    setTwisterAttempts(p => Math.min(p + 1, TWISTER_REQUIRED));
                  }) : undefined}
                  onPressOut={!taskSpeech.supported ? cancelHoldRecord : undefined}
                  disabled={twisterRecording}
                  style={[S.micBtn, { backgroundColor: twisterRecording ? "#5B3DFF" : "rgba(91,61,255,0.25)" }]}
                >
                  <Feather name={twisterRecording ? "mic" : "mic-off"} size={30} color={twisterRecording ? "#FFFFFF" : "#9B8FFF"} />
                </RNPressable>
              )}

              <Text style={S.hint}>
                {taskSpeech.supported ? "Tap mic and say it — repeat 3 times" : "Press and hold (3.5 sec) — repeat 3 times"}
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              {twisterDone ? (
                <RNPressable onPress={() => { void completeTwisterTask(); }} style={S.greenBtn}>
                  <Text style={S.greenBtnTxt}>Complete task (+5 coins)</Text>
                </RNPressable>
              ) : null}
              <RNPressable onPress={closeTwisterOverlay} style={{ paddingVertical: 12, alignItems: "center" }}>
                <Text style={{ color: "rgba(255,255,255,0.35)", fontFamily: "Inter_500Medium", fontSize: 14 }}>Cancel</Text>
              </RNPressable>
            </View>
          </View>
        )}

        {/* ════════════════════ Main scroll list ══════════════════════════════ */}
        <ScrollView
          contentContainerStyle={{ paddingTop: Platform.OS === "web" ? 24 : 16, paddingBottom: insets.bottom + 32, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary card */}
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.mutedForeground }}>Today's progress</Text>
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 22, color: colors.foreground, marginTop: 6 }}>{done} / {total} done</Text>
              </View>
              <View style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "#FFF1D6" }}>
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: "#7A4A00" }}>
                  +{DAILY_TASKS.reduce((s, t) => s + t.reward, 0)} coins possible
                </Text>
              </View>
            </View>
            <View style={{ marginTop: 16 }}>
              <ProgressBar value={pct} color={colors.primary} />
            </View>
          </Card>

          {/* Task list */}
          <View style={{ gap: 10, marginTop: 18 }}>
            {DAILY_TASKS.map((t) => {
              const isDone = state.completedTasks.includes(t.id);
              const isGreetTask = t.id === "task-greet-5";

              let actionLabel = "Start";
              if (t.id === "task-self-intro") actionLabel = "Record";
              else if (t.id === "task-listen-podcast") actionLabel = "Practice";
              else if (t.id === "task-learn-words") actionLabel = "Quiz";
              else if (t.id === "task-tongue-twister") actionLabel = "Record";
              else if (t.id === "task-real-talk") actionLabel = "Start call";
              else if (isGreetTask) actionLabel = greetCount > 0 ? "Continue" : "Call now";

              return (
                <Card key={t.id}>
                  <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
                    {/* Icon */}
                    <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: isDone ? colors.muted : TYPE_BG[t.type], alignItems: "center", justifyContent: "center" }}>
                      <Feather name={isDone ? "check" : TYPE_ICONS[t.type]} size={20} color={isDone ? colors.mutedForeground : TYPE_FG[t.type]} />
                    </View>

                    {/* Body */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 15, color: colors.foreground }}>{t.title}</Text>
                        {isDone && <Feather name="check-circle" size={14} color={colors.success} />}
                      </View>
                      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground, marginTop: 4, lineHeight: 18 }}>{t.description}</Text>

                      {/* Task 1: 5-bubble progress (replaces numeric counter) */}
                      {isGreetTask && !isDone && (
                        <View style={{ marginTop: 10 }}>
                          <View style={{ flexDirection: "row", gap: 8 }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <View key={i} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: i < greetCount ? "#5B3DFF" : "rgba(91,61,255,0.1)", borderWidth: 1.5, borderColor: i < greetCount ? "#5B3DFF" : "rgba(91,61,255,0.3)", alignItems: "center", justifyContent: "center" }}>
                                {i < greetCount
                                  ? <Feather name="check" size={13} color="#FFFFFF" />
                                  : <Feather name="user" size={12} color="rgba(91,61,255,0.4)" />}
                              </View>
                            ))}
                          </View>
                          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground, marginTop: 6 }}>
                            Each completed call counts as one greeting ({greetCount}/5).
                          </Text>
                        </View>
                      )}

                      {/* Other tasks: clock + coins */}
                      {!isGreetTask && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Feather name="clock" size={11} color={colors.mutedForeground} />
                            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 11, color: colors.mutedForeground }}>{t.minutes} min</Text>
                          </View>
                          <CoinBadge amount={t.reward} size="sm" />
                        </View>
                      )}
                    </View>

                    {/* Action button */}
                    {isDone ? (
                      <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.muted }}>
                        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: colors.mutedForeground }}>Done ✓</Text>
                      </View>
                    ) : (
                      <Pressable onPress={() => handlePress(t)}>
                        <View style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: isGreetTask && greetCount > 0 ? "#5B3DFF22" : colors.primary, borderWidth: isGreetTask && greetCount > 0 ? 1 : 0, borderColor: colors.primary }}>
                          <Text style={{ color: isGreetTask && greetCount > 0 ? colors.primary : "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 12 }}>
                            {actionLabel}
                          </Text>
                        </View>
                      </Pressable>
                    )}
                  </View>
                </Card>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </>
  );
}

// ── Shared styles ────────────────────────────────────────────────────────────
import { StyleSheet } from "react-native";
const S = StyleSheet.create({
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  greenBtn: { backgroundColor: "#16A085", paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  greenBtnTxt: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 16 } as const,
  purpleBtn: { backgroundColor: "#5B3DFF", paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  purpleBtnTxt: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 16 } as const,
  micBtn: { width: 76, height: 76, borderRadius: 38, borderWidth: 2, borderColor: "#5B3DFF", alignItems: "center", justifyContent: "center" },
  errTxt: { color: "#FF7A45", fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "center" } as const,
  hint: { color: "rgba(255,255,255,0.4)", fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" } as const,
});
