import React from "react";
import { Text, View } from "react-native";

type Status = "live" | "in-call" | "away" | "offline";

type Props = {
  initials: string;
  size?: number;
  color?: string;
  online?: boolean;
  status?: Status;
};

const STATUS_COLORS: Record<Status, string> = {
  live: "#16A085",
  "in-call": "#FF7A45",
  away: "#F5A524",
  offline: "#9CA3AF",
};

export function Avatar({ initials, size = 48, color = "#5B3DFF", online, status }: Props) {
  const effectiveStatus: Status | undefined = status ?? (online ? "live" : undefined);
  return (
    <View>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: size * 0.38,
            fontFamily: "Inter_700Bold",
            letterSpacing: 0.5,
          }}
        >
          {initials}
        </Text>
      </View>
      {effectiveStatus ? (
        <View
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: size * 0.14,
            backgroundColor: STATUS_COLORS[effectiveStatus],
            borderWidth: 2,
            borderColor: "#FFFFFF",
          }}
        />
      ) : null}
    </View>
  );
}
