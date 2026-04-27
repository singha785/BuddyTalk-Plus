import React from "react";
import { StyleProp, Text, View, ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

type PillProps = {
  label: string;
  tone?: "default" | "primary" | "accent" | "success" | "warning";
  style?: StyleProp<ViewStyle>;
};

export function Pill({ label, tone = "default", style }: PillProps) {
  const colors = useColors();
  const palette: Record<string, { bg: string; fg: string }> = {
    default: { bg: colors.muted, fg: colors.mutedForeground },
    primary: { bg: "#EAE2FF", fg: colors.primary },
    accent: { bg: "#FFE9DD", fg: "#A93D00" },
    success: { bg: "#DDF5EE", fg: "#0E6F5A" },
    warning: { bg: "#FFF1D6", fg: "#7A4A00" },
  };
  const c = palette[tone] ?? palette.default;
  return (
    <View
      style={[
        {
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 999,
          backgroundColor: c.bg,
          alignSelf: "flex-start",
        },
        style,
      ]}
    >
      <Text
        style={{
          color: c.fg,
          fontSize: 11,
          fontFamily: "Inter_600SemiBold",
          letterSpacing: 0.3,
        }}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}
