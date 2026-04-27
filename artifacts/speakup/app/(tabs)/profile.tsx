import { Feather } from "@expo/vector-icons";
import React from "react";
import { Alert, Platform, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { Pressable } from "@/components/Pressable";
import { ProgressBar } from "@/components/ProgressBar";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const GOAL_LABELS: Record<string, string> = {
  job: "Better Job",
  study: "Studies",
  daily: "Daily Talk",
  travel: "Travel",
};

export default function ProfileTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, resetAccount } = useApp();
  const [safeMode, setSafeMode] = React.useState<boolean>(true);
  const [notifications, setNotifications] = React.useState<boolean>(true);

  const initials = (state.profile.name || "S").charAt(0).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            alignItems: "center",
            paddingTop: 8,
            paddingBottom: 24,
          }}
        >
          <Avatar initials={initials} size={88} color={colors.primary} />
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 22,
              color: colors.foreground,
              marginTop: 14,
            }}
          >
            {state.profile.name || "SpeakUp Learner"}
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: colors.mutedForeground,
              marginTop: 4,
            }}
          >
            {state.profile.region}
          </Text>
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginTop: 12,
            }}
          >
            {state.profile.level ? (
              <Pill label={state.profile.level} tone="primary" />
            ) : null}
            {state.profile.goal ? (
              <Pill label={GOAL_LABELS[state.profile.goal] || ""} tone="accent" />
            ) : null}
            {state.premium ? <Pill label="Premium" tone="warning" /> : null}
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            gap: 12,
          }}
        >
          <Stat label="Streak" value={state.streak} suffix=" days" />
          <Stat label="Calls" value={state.totalCalls} />
          <Stat label="Lessons" value={state.completedLessons.length} />
        </View>

        <Text style={sectionHeader(colors)}>Skill progress</Text>
        <Card>
          <ProgressRow label="Fluency" value={state.fluency} color={colors.primary} />
          <View style={{ height: 16 }} />
          <ProgressRow label="Pronunciation" value={state.pronunciation} color={colors.accent} />
          <View style={{ height: 16 }} />
          <ProgressRow label="Confidence" value={state.confidence} color={colors.success} />
        </Card>

        <Text style={sectionHeader(colors)}>Safety</Text>
        <Card padded={false}>
          <SettingRow
            icon="shield"
            label="Safe mode"
            description="Match only with verified users"
            right={
              <Switch
                value={safeMode}
                onValueChange={setSafeMode}
                trackColor={{ true: colors.primary }}
              />
            }
          />
          <Divider />
          <SettingRow
            icon="user-x"
            label="Blocked users"
            description="Manage your blocked list"
            onPress={() =>
              Alert.alert("Blocked users", "Nobody is on your block list.")
            }
          />
          <Divider />
          <SettingRow
            icon="alert-circle"
            label="Report a user"
            description="Tell us about something inappropriate"
            onPress={() =>
              Alert.alert(
                "Report",
                "Open a recent call from your call history to report a user.",
              )
            }
          />
        </Card>

        <Text style={sectionHeader(colors)}>Notifications</Text>
        <Card padded={false}>
          <SettingRow
            icon="bell"
            label="Daily reminders"
            description="A nudge to keep your streak alive"
            right={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ true: colors.primary }}
              />
            }
          />
        </Card>

        <Text style={sectionHeader(colors)}>Account</Text>
        <Card padded={false}>
          <SettingRow
            icon="globe"
            label="Language"
            description="English (default)"
            onPress={() =>
              Alert.alert("Language", "More translations coming soon.")
            }
          />
          <Divider />
          <SettingRow
            icon="help-circle"
            label="Help & support"
            description="FAQs and contact"
            onPress={() =>
              Alert.alert("Support", "Email support@speakup.app — we'll reply within 24h.")
            }
          />
          <Divider />
          <SettingRow
            icon="refresh-ccw"
            label="Reset progress"
            description="Clear all data on this device"
            onPress={() =>
              Alert.alert(
                "Reset everything?",
                "Your profile, coins, streak and lessons will be cleared.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Reset",
                    style: "destructive",
                    onPress: () => resetAccount(),
                  },
                ],
              )
            }
            destructive
          />
        </Card>

        <Text
          style={{
            textAlign: "center",
            color: colors.mutedForeground,
            fontFamily: "Inter_400Regular",
            fontSize: 12,
            marginTop: 28,
          }}
        >
          SpeakUp v1.0 · Made for South Asia
        </Text>
      </ScrollView>
    </View>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          fontSize: 22,
          color: colors.foreground,
        }}
      >
        {value}
        {suffix || ""}
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

function ProgressRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const colors = useColors();
  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 13,
            color: colors.foreground,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 13,
            color: colors.mutedForeground,
          }}
        >
          {value}%
        </Text>
      </View>
      <ProgressBar value={value} color={color} />
    </View>
  );
}

function SettingRow({
  icon,
  label,
  description,
  right,
  onPress,
  destructive,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const colors = useColors();
  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: destructive ? "#FFE3E5" : colors.muted,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Feather
          name={icon}
          size={16}
          color={destructive ? colors.destructive : colors.foreground}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 14,
            color: destructive ? colors.destructive : colors.foreground,
          }}
        >
          {label}
        </Text>
        {description ? (
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 12,
              color: colors.mutedForeground,
              marginTop: 2,
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {right ?? (
        onPress ? (
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        ) : null
      )}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

function Divider() {
  const colors = useColors();
  return (
    <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 64 }} />
  );
}

function sectionHeader(colors: ReturnType<typeof useColors>) {
  return {
    fontFamily: "Inter_700Bold" as const,
    fontSize: 18,
    color: colors.foreground,
    marginTop: 28,
    marginBottom: 12,
  };
}
