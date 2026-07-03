import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";

type AnyRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

function getSpeechRecognitionClass(): (new () => AnyRecognition) | null {
  if (Platform.OS !== "web") return null;
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"] ?? null) as (new () => AnyRecognition) | null;
}

export const isSpeechRecognitionSupported = (): boolean =>
  getSpeechRecognitionClass() !== null;

export type UseSpeechRecognitionReturn = {
  supported: boolean;
  listening: boolean;
  transcript: string;
  error: string | null;
  startListening: (lang?: string) => void;
  stopListening: () => void;
  reset: () => void;
};

export function useSpeechRecognition(
  onResult: (transcript: string) => void,
): UseSpeechRecognitionReturn {
  const SR = getSpeechRecognitionClass();
  const supported = SR !== null;

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<AnyRecognition | null>(null);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const startListening = useCallback(
    (lang = "en-IN") => {
      if (!SR) return;
      stopListening();
      setError(null);
      setTranscript("");

      const recognition = new SR();
      recognition.lang = lang;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;
      recognitionRef.current = recognition;

      recognition.onstart = () => setListening(true);

      recognition.onresult = (event: unknown) => {
        try {
          const ev = event as { results: ArrayLike<ArrayLike<{ transcript: string }>> };
          const best = Array.from(ev.results)
            .map((r) => Array.from(r)[0].transcript)
            .join(" ")
            .trim();
          setTranscript(best);
          onResult(best);
        } catch {
          onResult("");
        }
      };

      recognition.onerror = (event: unknown) => {
        const ev = event as { error?: string };
        if (ev.error === "no-speech") {
          setError("No speech detected. Please try again.");
        } else if (ev.error === "not-allowed") {
          setError("Microphone access denied. Please allow microphone access in your browser.");
        } else {
          setError("Could not recognise speech. Please try again.");
        }
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
        recognitionRef.current = null;
      };

      try {
        recognition.start();
      } catch {
        setError("Could not start speech recognition. Please try again.");
        setListening(false);
      }
    },
    [SR, stopListening, onResult],
  );

  const reset = useCallback(() => {
    stopListening();
    setTranscript("");
    setError(null);
  }, [stopListening]);

  return { supported, listening, transcript, error, startListening, stopListening, reset };
}
