import React from "react";
import { View } from "react-native";

import { useColors } from "@/hooks/useColors";

type Props = {
  value: number; // 0..100
  height?: number;
  color?: string;
  trackColor?: string;
};

export function ProgressBar({ value, height = 8, color, trackColor }: Props) {
  const colors = useColors();
  const safe = Math.min(100, Math.max(0, value));
  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: trackColor ?? colors.muted,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${safe}%`,
          height: "100%",
          backgroundColor: color ?? colors.primary,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}
