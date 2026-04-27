import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
};

export function Card({ children, style, padded = true }: CardProps) {
  const colors = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 20,
          padding: padded ? 18 : 0,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: "#1A1530",
          shadowOpacity: 0.04,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
