import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  Text,
  View,
} from "react-native";

import { Card } from "@/components/Card";
import { Pressable } from "@/components/Pressable";
import { useColors } from "@/hooks/useColors";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useVoicePreference } from "@/hooks/useVoicePreference";
import {
  PASS_THRESHOLD,
  scoreColor,
  scoreLabel,
  scorePronunciation,
  type PronunciationScore,
} from "@/utils/pronunciationScore";
import { TALKS } from "@/data/talks";

export default function TalkDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();

  const talk = useMemo(
    () => TALKS.find((item) => item.id === id),
    [id],
  );

  const [showHindi, setShowHindi] = useState(true);
  const [currentLine, setCurrentLine] = useState(0);
  const [phase, setPhase] = useState<"idle" | "speaking" | "listening" | "scored">("idle");
  const [score, setScore] = useState<PronunciationScore | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [practiceMode, setPracticeMode] = useState(false);

  const { selectedVoice, speak, stop } = useVoicePreference();

  const handleRecognitionResult = useCallback(
    (transcript: string) => {
      const expected = talk?.lines[currentLine]?.english ?? "";
      if (!expected) return;

      const result = scorePronunciation(expected, transcript);
      setScore(result);
      setAttempts((value) => value + 1);
      setPhase("scored");
    },
    [talk, currentLine],
  );

  const stt = useSpeechRecognition(handleRecognitionResult);

  const speakCurrent = useCallback(() => {
    const text = talk?.lines[currentLine]?.english ?? "";
    if (!text) return;

    stt.stopListening();
    setPhase("speaking");
    speak(text, () => setPhase("idle"));
  }, [talk, currentLine, speak, stt]);

  const handleStartListening = useCallback(() => {
    stop();
    stt.reset();
    setScore(null);
    setPhase("listening");
    stt.startListening(selectedVoice.language);
  }, [stop, stt, selectedVoice.language]);

  const handleStopListening = useCallback(() => {
    stt.stopListening();
    setPhase("idle");
  }, [stt]);

  const handleRetry = useCallback(() => {
    stt.reset();
    setScore(null);
    setPhase("idle");
    speakCurrent();
  }, [stt, speakCurrent]);

  useEffect(() => {
    setScore(null);
    setAttempts(0);
    setPracticeMode(false);
    stt.reset();
  }, [currentLine, talk?.id]);

  useEffect(() => {
    return () => {
      stop();
      stt.stopListening();
    };
  }, []);

  if (!talk) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 20,
            color: colors.foreground,
          }}
        >
          Talk not found
        </Text>

        <Pressable
          onPress={() => router.back()}
          style={{
            marginTop: 16,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: colors.primary,
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              color: "#FFFFFF",
            }}
          >
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  const line = talk.lines[currentLine];
  const progress = Math.round(
    ((currentLine + 1) / talk.lines.length) * 100,
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: 60,
          paddingHorizontal: 20,
          paddingBottom: 50,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather
              name="arrow-left"
              size={20}
              color={colors.foreground}
            />
          </Pressable>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Feather
              name="message-circle"
              size={18}
              color={colors.primary}
            />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                color: colors.foreground,
              }}
            >
              Situational Talk
            </Text>
          </View>

          <View style={{ width: 42 }} />
        </View>

        {/* Title */}
        <Text
          style={{
            marginTop: 24,
            fontFamily: "Inter_700Bold",
            fontSize: 28,
            color: colors.foreground,
          }}
        >
          {talk.title}
        </Text>

        <Text
          style={{
            marginTop: 6,
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            lineHeight: 21,
            color: colors.mutedForeground,
          }}
        >
          {talk.description}
        </Text>

        {/* Progress */}
        <Card style={{ marginTop: 18 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 13,
                  color: colors.mutedForeground,
                }}
              >
                Conversation progress
              </Text>

              <Text
                style={{
                  marginTop: 4,
                  fontFamily: "Inter_700Bold",
                  fontSize: 18,
                  color: colors.foreground,
                }}
              >
                {currentLine + 1} of {talk.lines.length}
              </Text>
            </View>

            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 18,
                color: colors.primary,
              }}
            >
              {progress}%
            </Text>
          </View>

          <View
            style={{
              height: 7,
              borderRadius: 99,
              backgroundColor: colors.border,
              marginTop: 12,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${progress}%`,
                height: "100%",
                backgroundColor: colors.primary,
              }}
            />
          </View>
        </Card>

        {/* Hindi toggle */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            marginTop: 16,
          }}
        >
          <Pressable onPress={() => setShowHindi((value) => !value)}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                paddingHorizontal: 13,
                paddingVertical: 9,
                borderRadius: 999,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Feather
                name={showHindi ? "eye" : "eye-off"}
                size={15}
                color={colors.primary}
              />

              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 12,
                  color: colors.foreground,
                }}
              >
                {showHindi ? "Hide Hindi" : "Show Hindi"}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Current practice sentence */}
        <Card
          style={{
            marginTop: 14,
            padding: 20,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontFamily: "Inter_700Bold",
                  fontSize: 13,
                }}
              >
                {line.speaker}
              </Text>
            </View>

            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 12,
                color: colors.mutedForeground,
              }}
            >
              {line.speaker === "A"
                ? "Interviewer / Teacher"
                : "Your Conversation Partner"}
            </Text>
          </View>

          <Text
            style={{
              marginTop: 18,
              fontFamily: "Inter_700Bold",
              fontSize: 22,
              lineHeight: 31,
              color: colors.foreground,
            }}
          >
            {line.english}
          </Text>

          {showHindi ? (
            <View
              style={{
                marginTop: 12,
                padding: 13,
                borderRadius: 12,
                backgroundColor: colors.background,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 15,
                  lineHeight: 23,
                  color: colors.mutedForeground,
                }}
              >
                {line.hindi}
              </Text>
            </View>
          ) : null}

          {line.pronunciationFocus ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                marginTop: 14,
              }}
            >
              <Feather
                name="volume-2"
                size={15}
                color={colors.primary}
              />

              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 12,
                  color: colors.primary,
                }}
              >
                Focus: {line.pronunciationFocus}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Practice controls */}
        <View style={{ gap: 10, marginTop: 16 }}>
          <Pressable
            onPress={speakCurrent}
            style={{
              paddingVertical: 14,
              borderRadius: 14,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Feather
                name="volume-2"
                size={18}
                color={colors.primary}
              />
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  color: colors.foreground,
                }}
              >
                Listen
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              setPracticeMode(true);
              if (phase === "listening") {
                handleStopListening();
              } else {
                handleStartListening();
              }
            }}
            style={{
              paddingVertical: 14,
              borderRadius: 14,
              backgroundColor: colors.primary,
              alignItems: "center",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Feather
                name="mic"
                size={18}
                color="#FFFFFF"
              />
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  color: "#FFFFFF",
                }}
              >
                {phase === "listening" ? "Stop Listening" : "Practice This Sentence"}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Practice feedback */}
        {practiceMode && (
          <Card
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 16,
              gap: 12,
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: colors.foreground,
              }}
            >
              Pronunciation Practice
            </Text>

            {phase === "listening" && (
              <Text
                style={{
                  color: colors.primary,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                Listening? Speak the sentence clearly.
              </Text>
            )}

            {stt.error && (
              <Text
                style={{
                  color: colors.destructive,
                  fontSize: 14,
                }}
              >
                {stt.error}
              </Text>
            )}

            {stt.transcript ? (
              <View style={{ gap: 6 }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.mutedForeground,
                  }}
                >
                  What you said
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    lineHeight: 22,
                    color: colors.foreground,
                  }}
                >
                  ?{stt.transcript}?
                </Text>
              </View>
            ) : null}

            {score ? (
              <View style={{ gap: 10 }}>
                <View
                  style={{
                    alignItems: "center",
                    paddingVertical: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 38,
                      fontWeight: "800",
                      color: scoreColor(score.overall),
                    }}
                  >
                    {score.overall}%
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: scoreColor(score.overall),
                    }}
                  >
                    {scoreLabel(score.overall)}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.mutedForeground,
                      }}
                    >
                      Accuracy
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: colors.foreground,
                      }}
                    >
                      {score.accuracy}%
                    </Text>
                  </View>

                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.mutedForeground,
                      }}
                    >
                      Completeness
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: colors.foreground,
                      }}
                    >
                      {score.completeness}%
                    </Text>
                  </View>

                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.mutedForeground,
                      }}
                    >
                      Fluency
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: colors.foreground,
                      }}
                    >
                      {score.fluency}%
                    </Text>
                  </View>
                </View>

                {score.missedWords.length > 0 && (
                  <View style={{ gap: 5 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: colors.mutedForeground,
                      }}
                    >
                      Practice these words again
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.foreground,
                      }}
                    >
                      {score.missedWords.join(", ")}
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={handleRetry}
                  style={{
                    minHeight: 46,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: colors.secondary,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: colors.foreground,
                    }}
                  >
                    Practice Again
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </Card>
        )}

        {/* Navigation */}
        <View
          style={{
            flexDirection: "row",
            gap: 10,
            marginTop: 18,
          }}
        >
          <Pressable
            disabled={currentLine === 0}
            onPress={() =>
              setCurrentLine((value) => Math.max(0, value - 1))
            }
            style={{
              flex: 1,
              paddingVertical: 13,
              borderRadius: 13,
              backgroundColor:
                currentLine === 0
                  ? colors.border
                  : colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                color:
                  currentLine === 0
                    ? colors.mutedForeground
                    : colors.foreground,
              }}
            >
              Previous
            </Text>
          </Pressable>

          <Pressable
            disabled={currentLine === talk.lines.length - 1}
            onPress={() =>
              setCurrentLine((value) =>
                Math.min(talk.lines.length - 1, value + 1),
              )
            }
            style={{
              flex: 1,
              paddingVertical: 13,
              borderRadius: 13,
              backgroundColor:
                currentLine === talk.lines.length - 1
                  ? colors.border
                  : colors.foreground,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                color:
                  currentLine === talk.lines.length - 1
                    ? colors.mutedForeground
                    : colors.background,
              }}
            >
              Next
            </Text>
          </Pressable>
        </View>

        {/* Goal */}
        <View
          style={{
            marginTop: 24,
            padding: 16,
            borderRadius: 14,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 14,
              color: colors.foreground,
            }}
          >
            Today's goal
          </Text>

          <Text
            style={{
              marginTop: 5,
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              lineHeight: 20,
              color: colors.mutedForeground,
            }}
          >
            {talk.goal}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}



