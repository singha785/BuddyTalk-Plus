import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

type Props = {
  icon?: React.ComponentProps<typeof Feather>["name"];
  title: string;
  message?: string;
};

export function EmptyState({ icon = "inbox", title, message }: Props) {
  const colors = useColors();
  return (
    <View
      style={{
        alignItems: "center",
        paddingVertical: 40,
        paddingHorizontal: 24,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.muted,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Feather name={icon} size={28} color={colors.mutedForeground} />
      </View>
      <Text
        style={{
          fontFamily: "Inter_600SemiBold",
          fontSize: 16,
          color: colors.foreground,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      {message ? (
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            color: colors.mutedForeground,
            textAlign: "center",
            marginTop: 6,
          }}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}
