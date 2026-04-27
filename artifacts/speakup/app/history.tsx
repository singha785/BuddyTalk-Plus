import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import React, { useMemo, useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { Pressable } from "@/components/Pressable";
import { useApp, type CallHistoryEntry } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { showAlert } from "@/utils/alert";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

export default function CallHistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, blockUser, reportCall } = useApp();
  const [selected, setSelected] = useState<CallHistoryEntry | null>(null);

  const isBlocked = useMemo(
    () => (selected ? state.blockedUsers.includes(selected.partnerName) : false),
    [selected, state.blockedUsers],
  );

  const handleReport = () => {
    if (!selected) return;
    if (selected.reported) {
      showAlert("Already reported", "Our safety team is reviewing this call.");
      return;
    }
    showAlert(
      "Report this user?",
      `We'll review your call with ${selected.partnerName} and take action within 24 hours.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report",
          style: "destructive",
          onPress: async () => {
            await reportCall(selected.id);
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            ).catch(() => undefined);
            setSelected({ ...selected, reported: true });
            showAlert("Thanks", "We've received your report.");
          },
        },
      ],
    );
  };

  const handleBlock = () => {
    if (!selected) return;
    if (isBlocked) {
      showAlert("Already blocked", `${selected.partnerName} cannot match with you.`);
      return;
    }
    showAlert(
      "Block this user?",
      `${selected.partnerName} won't be matched with you again.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            await blockUser(selected.partnerName);
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            ).catch(() => undefined);
            showAlert("Blocked", `${selected.partnerName} is now on your block list.`);
          },
        },
      ],
    );
  };

  const totalMinutes = state.callHistory.reduce(
    (sum, c) => sum + c.durationMinutes,
    0,
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "Call history",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleStyle: { fontFamily: "Inter_700Bold" },
        }}
      />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: Platform.OS === "web" ? 24 : 8,
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary */}
          <Card>
            <View
              style={{
                flexDirection: "row",
                gap: 16,
              }}
            >
              <Stat label="Calls" value={state.callHistory.length.toString()} />
              <Stat label="Minutes" value={totalMinutes.toString()} />
              <Stat label="Streak" value={`${state.streak}d`} />
            </View>
          </Card>

          {state.callHistory.length === 0 ? (
            <View
              style={{
                alignItems: "center",
                marginTop: 60,
                paddingHorizontal: 24,
              }}
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: colors.muted,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="phone" size={28} color={colors.mutedForeground} />
              </View>
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 18,
                  color: colors.foreground,
                  marginTop: 16,
                }}
              >
                No calls yet
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 14,
                  color: colors.mutedForeground,
                  marginTop: 6,
                  textAlign: "center",
                }}
              >
                Start a random practice call from the home screen and your history will show up here.
              </Text>
              <View style={{ marginTop: 18 }}>
                <Button
                  label="Start a call"
                  icon="phone-call"
                  onPress={() => router.push("/practice")}
                />
              </View>
            </View>
          ) : (
            <>
              <Text style={sectionHeader(colors)}>Recent</Text>
              <View style={{ gap: 10 }}>
                {state.callHistory.map((c) => (
                  <Pressable key={c.id} onPress={() => setSelected(c)}>
                    <Card>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 14,
                        }}
                      >
                        <Avatar
                          initials={c.partnerInitials}
                          size={48}
                          color={c.partnerColor}
                        />
                        <View style={{ flex: 1 }}>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: "Inter_700Bold",
                                fontSize: 15,
                                color: colors.foreground,
                              }}
                            >
                              {c.partnerName}
                            </Text>
                            <Pill
                              label={c.type === "mentor" ? "Mentor" : "Practice"}
                              tone={c.type === "mentor" ? "primary" : "default"}
                            />
                            {c.reported ? (
                              <Pill label="Reported" tone="warning" />
                            ) : null}
                          </View>
                          <Text
                            style={{
                              fontFamily: "Inter_400Regular",
                              fontSize: 12,
                              color: colors.mutedForeground,
                              marginTop: 4,
                            }}
                          >
                            {c.partnerRegion ?? "Unknown"} · {relativeTime(c.date)}
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={{
                              fontFamily: "Inter_700Bold",
                              fontSize: 14,
                              color: colors.foreground,
                            }}
                          >
                            {c.durationMinutes} min
                          </Text>
                          {c.coinsSpent ? (
                            <Text
                              style={{
                                fontFamily: "Inter_500Medium",
                                fontSize: 11,
                                color: colors.mutedForeground,
                                marginTop: 2,
                              }}
                            >
                              -{c.coinsSpent} coins
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {state.blockedUsers.length > 0 ? (
            <>
              <Text style={sectionHeader(colors)}>Blocked</Text>
              <Card padded={false}>
                {state.blockedUsers.map((name, idx) => (
                  <BlockedRow key={name} name={name} divider={idx > 0} />
                ))}
              </Card>
            </>
          ) : null}
        </ScrollView>

        {/* Detail sheet */}
        {selected ? (
          <Pressable
            onPress={() => setSelected(null)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.45)",
              justifyContent: "flex-end",
            }}
          >
            <Pressable onPress={() => undefined}>
              <View
                style={{
                  backgroundColor: colors.background,
                  borderTopLeftRadius: 28,
                  borderTopRightRadius: 28,
                  padding: 22,
                  paddingBottom: insets.bottom + 22,
                  gap: 16,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: colors.border,
                    alignSelf: "center",
                  }}
                />
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <Avatar
                    initials={selected.partnerInitials}
                    size={56}
                    color={selected.partnerColor}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: "Inter_700Bold",
                        fontSize: 18,
                        color: colors.foreground,
                      }}
                    >
                      {selected.partnerName}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 13,
                        color: colors.mutedForeground,
                        marginTop: 2,
                      }}
                    >
                      {selected.partnerRegion ?? "Unknown"} ·{" "}
                      {selected.durationMinutes} min · {relativeTime(selected.date)}
                    </Text>
                  </View>
                </View>

                {selected.feedback ? (
                  <View style={{ gap: 10 }}>
                    <FeedbackRow
                      icon="thumbs-up"
                      bg="#DDF5EE"
                      iconColor="#0E6F5A"
                      label="What went well"
                      text={selected.feedback.good}
                    />
                    <FeedbackRow
                      icon="trending-up"
                      bg="#FFE9DD"
                      iconColor="#A93D00"
                      label="One thing to try"
                      text={selected.feedback.improve}
                    />
                  </View>
                ) : (
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 13,
                      color: colors.mutedForeground,
                    }}
                  >
                    No coaching notes were saved for this session.
                  </Text>
                )}

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      label={selected.reported ? "Reported" : "Report"}
                      icon="alert-circle"
                      variant="outline"
                      onPress={handleReport}
                      disabled={selected.reported}
                      fullWidth
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label={isBlocked ? "Blocked" : "Block"}
                      icon="user-x"
                      variant="outline"
                      onPress={handleBlock}
                      disabled={isBlocked}
                      fullWidth
                    />
                  </View>
                </View>
                <Button
                  label="Close"
                  variant="secondary"
                  onPress={() => setSelected(null)}
                  fullWidth
                />
              </View>
            </Pressable>
          </Pressable>
        ) : null}
      </View>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          fontSize: 22,
          color: colors.foreground,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: "Inter_500Medium",
          fontSize: 12,
          color: colors.mutedForeground,
          marginTop: 4,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function FeedbackRow({
  icon,
  bg,
  iconColor,
  label,
  text,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  bg: string;
  iconColor: string;
  label: string;
  text: string;
}) {
  const colors = useColors();
  return (
    <Card>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: bg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name={icon} size={16} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 13,
              color: colors.foreground,
            }}
          >
            {label}
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: colors.mutedForeground,
              marginTop: 4,
              lineHeight: 18,
            }}
          >
            {text}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function BlockedRow({ name, divider }: { name: string; divider: boolean }) {
  const colors = useColors();
  const { unblockUser } = useApp();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderTopWidth: divider ? 1 : 0,
        borderTopColor: colors.border,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.muted,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Feather name="user-x" size={16} color={colors.mutedForeground} />
      </View>
      <Text
        style={{
          flex: 1,
          fontFamily: "Inter_600SemiBold",
          fontSize: 14,
          color: colors.foreground,
        }}
      >
        {name}
      </Text>
      <Pressable onPress={() => unblockUser(name)}>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 13,
            color: colors.primary,
          }}
        >
          Unblock
        </Text>
      </Pressable>
    </View>
  );
}

function sectionHeader(colors: ReturnType<typeof useColors>) {
  return {
    fontFamily: "Inter_700Bold" as const,
    fontSize: 18,
    color: colors.foreground,
    marginTop: 24,
    marginBottom: 12,
  };
}
