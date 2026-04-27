import React from "react";
import { Text, View } from "react-native";

type Props = {
  initials: string;
  size?: number;
  color?: string;
  online?: boolean;
};

export function Avatar({ initials, size = 48, color = "#5B3DFF", online }: Props) {
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
      {online ? (
        <View
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: size * 0.14,
            backgroundColor: "#16A085",
            borderWidth: 2,
            borderColor: "#FFFFFF",
          }}
        />
      ) : null}
    </View>
  );
}
