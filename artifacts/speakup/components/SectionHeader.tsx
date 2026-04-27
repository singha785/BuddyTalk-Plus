import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

type Props = {
  title: string;
  action?: { label: string; onPress: () => void };
};

export function SectionHeader({ title, action }: Props) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 4,
        marginBottom: 12,
        marginTop: 24,
      }}
    >
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          fontSize: 18,
          color: colors.foreground,
        }}
      >
        {title}
      </Text>
      {action ? (
        <TouchableOpacity onPress={action.onPress} hitSlop={8}>
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 13,
              color: colors.primary,
            }}
          >
            {action.label}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
