import * as Haptics from "expo-haptics";
import React from "react";
import {
  Pressable as RNPressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from "react-native";

type Props = PressableProps & {
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Pressable({ haptic = true, onPress, style, ...rest }: Props) {
  return (
    <RNPressable
      onPress={(e) => {
        if (haptic) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
            () => undefined,
          );
        }
        onPress?.(e);
      }}
      style={({ pressed }) => [
        { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        typeof style === "function" ? style({ pressed, hovered: false }) : style,
      ]}
      {...rest}
    />
  );
}
