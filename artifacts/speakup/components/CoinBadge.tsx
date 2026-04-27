import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

type Props = {
  amount: number;
  size?: "sm" | "md" | "lg";
};

export function CoinBadge({ amount, size = "md" }: Props) {
  const colors = useColors();
  const sizeMap = { sm: 12, md: 14, lg: 18 };
  const padMap = { sm: 6, md: 8, lg: 10 };
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#FFF1D6",
        borderRadius: 999,
        paddingHorizontal: padMap[size] + 2,
        paddingVertical: padMap[size] - 2,
      }}
    >
      <Feather name="zap" size={sizeMap[size]} color="#B8770B" />
      <Text
        style={{
          color: "#7A4A00",
          fontFamily: "Inter_700Bold",
          fontSize: sizeMap[size],
        }}
      >
        {amount}
      </Text>
    </View>
  );
}

export function CoinIcon({ size = 14, color = "#B8770B" }: { size?: number; color?: string }) {
  // Re-export so callers can use the icon glyph alone.
  return <Feather name="zap" size={size} color={color} />;
}

void useColors;
