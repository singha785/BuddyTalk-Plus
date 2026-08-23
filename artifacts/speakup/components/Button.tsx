import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { Pressable } from "@/components/Pressable";
import { useColors } from "@/hooks/useColors";

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "outline" | "destructive";
  size?: "md" | "lg";
  icon?: React.ComponentProps<typeof Feather>["name"];
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  loading,
  disabled,
  fullWidth,
}: ButtonProps) {
  const colors = useColors();
  const heights = { md: 50, lg: 58 };
  const fontSizes = { md: 15, lg: 17 };

  const baseStyle: ViewStyle = {
    height: heights[size],
    borderRadius: 999,
    paddingHorizontal: size === "lg" ? 24 : 18,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    width: fullWidth ? "100%" : undefined,
    opacity: disabled ? 0.5 : 1,
  };

  const renderInner = (textColor: string) => (
    <>
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon ? <Feather name={icon} size={18} color={textColor} /> : null}
          <Text
            style={{
              color: textColor,
              fontFamily: "Inter_600SemiBold",
              fontSize: fontSizes[size],
              letterSpacing: 0.2,
            }}
          >
            {label}
          </Text>
        </>
      )}
    </>
  );

  if (variant === "primary") {
    return (
      <Pressable disabled={disabled || loading} onPress={onPress} style={baseStyle}>
        <LinearGradient
          colors={["#7456FF", "#5B3DFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
        />
        {renderInner("#FFFFFF")}
      </Pressable>
    );
  }

  if (variant === "secondary") {
    return (
      <Pressable
        disabled={disabled || loading}
        onPress={onPress}
        style={[baseStyle, { backgroundColor: colors.accent }]}
      >
        {renderInner("#FFFFFF")}
      </Pressable>
    );
  }

  if (variant === "outline") {
    return (
      <Pressable
        disabled={disabled || loading}
        onPress={onPress}
        style={[
          baseStyle,
          {
            backgroundColor: "transparent",
            borderWidth: 1.5,
            borderColor: colors.border,
          },
        ]}
      >
        {renderInner(colors.foreground)}
      </Pressable>
    );
  }

  if (variant === "destructive") {
    return (
      <Pressable
        disabled={disabled || loading}
        onPress={onPress}
        style={[baseStyle, { backgroundColor: colors.destructive }]}
      >
        {renderInner("#FFFFFF")}
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={[baseStyle, { backgroundColor: "transparent" }]}
    >
      <View>{renderInner(colors.primary)}</View>
    </Pressable>
  );
}
