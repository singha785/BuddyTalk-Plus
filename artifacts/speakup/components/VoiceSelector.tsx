import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Pressable as RNPressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { VOICE_OPTIONS, type VoiceOption } from "@/hooks/useVoicePreference";
import { useColors } from "@/hooks/useColors";

type Props = {
  visible: boolean;
  selected: VoiceOption;
  onSelect: (id: string) => void;
  onClose: () => void;
};

export function VoiceSelector({ visible, selected, onSelect, onClose }: Props) {
  const colors = useColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <RNPressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
        onPress={onClose}
      >
        <RNPressable
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 12,
            paddingBottom: 32,
            paddingHorizontal: 20,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.border,
              alignSelf: "center",
              marginBottom: 20,
            }}
          />
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 17,
              color: colors.foreground,
              marginBottom: 4,
            }}
          >
            Choose AI Voice
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: colors.mutedForeground,
              marginBottom: 20,
            }}
          >
            The AI coach will speak lessons using this voice.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {VOICE_OPTIONS.map((option) => {
              const isSelected = option.id === selected.id;
              return (
                <RNPressable
                  key={option.id}
                  onPress={() => { onSelect(option.id); onClose(); }}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 16,
                    marginBottom: 8,
                    backgroundColor: isSelected
                      ? colors.primary + "18"
                      : pressed
                      ? colors.muted
                      : "transparent",
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.primary : colors.border,
                  })}
                >
                  <Text style={{ fontSize: 24 }}>{option.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 14,
                        color: isSelected ? colors.primary : colors.foreground,
                      }}
                    >
                      {option.label}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 12,
                        color: colors.mutedForeground,
                        marginTop: 2,
                      }}
                    >
                      {option.accent.charAt(0).toUpperCase() + option.accent.slice(1)} accent ·{" "}
                      {option.language}
                    </Text>
                  </View>
                  {isSelected && (
                    <Feather name="check-circle" size={20} color={colors.primary} />
                  )}
                </RNPressable>
              );
            })}
          </ScrollView>
        </RNPressable>
      </RNPressable>
    </Modal>
  );
}
