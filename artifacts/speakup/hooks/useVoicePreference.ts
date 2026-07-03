import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Speech from "expo-speech";

export type VoiceOption = {
  id: string;
  label: string;
  language: string;
  gender: "female" | "male";
  accent: "indian" | "american" | "british";
  flag: string;
};

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: "female-indian",   label: "Female · Indian English",   language: "en-IN", gender: "female", accent: "indian",   flag: "🇮🇳" },
  { id: "male-indian",     label: "Male · Indian English",     language: "en-IN", gender: "male",   accent: "indian",   flag: "🇮🇳" },
  { id: "female-american", label: "Female · American English", language: "en-US", gender: "female", accent: "american", flag: "🇺🇸" },
  { id: "male-american",   label: "Male · American English",   language: "en-US", gender: "male",   accent: "american", flag: "🇺🇸" },
  { id: "female-british",  label: "Female · British English",  language: "en-GB", gender: "female", accent: "british",  flag: "🇬🇧" },
  { id: "male-british",    label: "Male · British English",    language: "en-GB", gender: "male",   accent: "british",  flag: "🇬🇧" },
];

const STORAGE_KEY = "speakup.voice.v1";
const DEFAULT_VOICE_ID = "female-indian";

type WebSpeechSynthesis = {
  getVoices(): Array<{ lang: string; name: string; voiceURI: string }>;
  speak(u: unknown): void;
  cancel(): void;
  addEventListener(evt: string, fn: () => void): void;
  removeEventListener(evt: string, fn: () => void): void;
};

type WebSpeechUtterance = {
  voice: { lang: string; name: string; voiceURI: string } | null;
  lang: string;
  rate: number;
  pitch: number;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  text: string;
};

function getWebSynth(): WebSpeechSynthesis | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  return (window as unknown as { speechSynthesis?: WebSpeechSynthesis }).speechSynthesis ?? null;
}

function makeUtterance(text: string): WebSpeechUtterance | null {
  if (typeof window === "undefined") return null;
  const U = (window as unknown as { SpeechSynthesisUtterance?: new (t: string) => WebSpeechUtterance }).SpeechSynthesisUtterance;
  if (!U) return null;
  return new U(text);
}

const FEMALE_KEYWORDS = ["female", "woman", "girl", "she", "her", "zira", "hazel", "susan", "aria", "jenny", "sonia", "samantha", "victoria", "karen", "moira", "fiona"];
const MALE_KEYWORDS   = ["male", "man", "boy", "he", "his", "david", "mark", "ryan", "daniel", "rishi", "alex", "fred", "jorge", "luca"];

function findWebVoice(option: VoiceOption): { lang: string; name: string; voiceURI: string } | null {
  const synth = getWebSynth();
  if (!synth) return null;
  const voices = synth.getVoices();
  if (!voices.length) return null;

  const langPrefix = option.language.toLowerCase().replace("-", "_");
  const sameLocale = voices.filter(
    (v) => v.lang.toLowerCase().replace("-", "_").startsWith(langPrefix.slice(0, 5)),
  );
  const pool = sameLocale.length > 0 ? sameLocale : voices.filter((v) => v.lang.toLowerCase().startsWith("en"));

  const keywords = option.gender === "female" ? FEMALE_KEYWORDS : MALE_KEYWORDS;
  const genderMatch = pool.find((v) => keywords.some((k) => v.name.toLowerCase().includes(k)));
  return genderMatch ?? pool[0] ?? null;
}

export type UseVoicePreferenceReturn = {
  selectedVoice: VoiceOption;
  setVoice: (id: string) => Promise<void>;
  speak: (text: string, onEnd?: () => void) => void;
  stop: () => void;
};

export function useVoicePreference(): UseVoicePreferenceReturn {
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_VOICE_ID);
  const voicesLoaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => { if (v) setSelectedId(v); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const synth = getWebSynth();
    if (!synth) return;
    const load = () => { voicesLoaded.current = true; };
    synth.addEventListener("voiceschanged", load);
    load();
    return () => synth.removeEventListener("voiceschanged", load);
  }, []);

  const setVoice = useCallback(async (id: string) => {
    setSelectedId(id);
    await AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
  }, []);

  const selectedVoice = VOICE_OPTIONS.find((v) => v.id === selectedId) ?? VOICE_OPTIONS[0];

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      const synth = getWebSynth();
      if (synth) {
        synth.cancel();
        const utterance = makeUtterance(text);
        if (utterance) {
          const webVoice = findWebVoice(selectedVoice);
          utterance.voice = webVoice;
          utterance.lang = selectedVoice.language;
          utterance.rate = 0.88;
          utterance.pitch = selectedVoice.gender === "female" ? 1.05 : 0.9;
          utterance.onend = onEnd ?? null;
          utterance.onerror = onEnd ?? null;
          synth.speak(utterance);
          return;
        }
      }
      Speech.stop();
      Speech.speak(text, {
        language: selectedVoice.language,
        pitch: selectedVoice.gender === "female" ? 1.1 : 0.9,
        rate: 0.88,
        onDone: onEnd,
        onError: onEnd,
        onStopped: onEnd,
      });
    },
    [selectedVoice],
  );

  const stop = useCallback(() => {
    Speech.stop();
    getWebSynth()?.cancel?.();
  }, []);

  return { selectedVoice, setVoice, speak, stop };
}
