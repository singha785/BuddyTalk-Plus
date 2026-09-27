import React from "react";
import {
  Modal,
  Pressable as RNPressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import type { AppLanguage } from "@/context/AppContext";

type LanguageOption = {
  id: AppLanguage;
  label: string;
  nativeLabel: string;
  description: string;
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { id: "en", label: "English", nativeLabel: "English", description: "Use English for app instructions" },
  { id: "hi", label: "Hindi", nativeLabel: "हिन्दी", description: "ऐप के निर्देश हिन्दी में" },
  { id: "bn", label: "Bengali", nativeLabel: "বাংলা", description: "অ্যাপের নির্দেশ বাংলা ভাষায়" },
  { id: "mr", label: "Marathi", nativeLabel: "मराठी", description: "अॅपचे निर्देश मराठीत" },
  { id: "te", label: "Telugu", nativeLabel: "తెలుగు", description: "యాప్ సూచనలు తెలుగులో" },
  { id: "ta", label: "Tamil", nativeLabel: "தமிழ்", description: "ஆப் வழிமுறைகள் தமிழில்" },
  { id: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ", description: "ಆಪ್ ಸೂಚನೆಗಳು ಕನ್ನಡದಲ್ಲಿ" },
  { id: "ml", label: "Malayalam", nativeLabel: "മലയാളം", description: "ആപ്പ് നിർദ്ദേശങ്ങൾ മലയാളത്തിൽ" },
  { id: "gu", label: "Gujarati", nativeLabel: "ગુજરાતી", description: "ઍપના નિર્દેશો ગુજરાતીમાં" },
  { id: "or", label: "Odia", nativeLabel: "ଓଡ଼ିଆ", description: "ଆପ୍ ନିର୍ଦ୍ଦେଶ ଓଡ଼ିଆରେ" },
  { id: "pa", label: "Punjabi", nativeLabel: "ਪੰਜਾਬੀ", description: "ਐਪ ਦੇ ਨਿਰਦੇਸ਼ ਪੰਜਾਬੀ ਵਿੱਚ" },
  { id: "as", label: "Assamese", nativeLabel: "অসমীয়া", description: "এপৰ নিৰ্দেশনা অসমীয়াত" },
  { id: "ur", label: "Urdu", nativeLabel: "اردو", description: "ایپ کی ہدایات اردو میں" },
  { id: "th", label: "Thai", nativeLabel: "ไทย", description: "คำแนะนำในแอปเป็นภาษาไทย" },
];

type Props = {
  visible: boolean;
  selected: AppLanguage;
  onSelect: (language: AppLanguage) => void;
  onClose: () => void;
};

export function LanguageSelector({
  visible,
  selected,
  onSelect,
  onClose,
}: Props) {
  const colors = useColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <RNPressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "flex-end",
        }}
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
            App Language
          </Text>

          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: colors.mutedForeground,
              marginBottom: 20,
            }}
          >
            Choose the language used for app instructions and practice guidance.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 430 }} contentContainerStyle={{ paddingBottom: 8 }}>
            {LANGUAGE_OPTIONS.map((option) => {
              const isSelected = option.id === selected;

              return (
                <RNPressable
                  key={option.id}
                  onPress={() => {
                    onSelect(option.id);
                    onClose();
                  }}
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
                    borderColor: isSelected
                      ? colors.primary
                      : colors.border,
                  })}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 15,
                        color: isSelected
                          ? colors.primary
                          : colors.foreground,
                      }}
                    >
                      {option.nativeLabel}
                    </Text>

                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 12,
                        color: colors.mutedForeground,
                        marginTop: 3,
                      }}
                    >
                      {option.label} · {option.description}
                    </Text>
                  </View>

                  {isSelected ? (
                    <Text
                      style={{
                        fontFamily: "Inter_700Bold",
                        fontSize: 18,
                        color: colors.primary,
                      }}
                    >
                      ✓
                    </Text>
                  ) : null}
                </RNPressable>
              );
            })}
          </ScrollView>
        </RNPressable>
      </RNPressable>
    </Modal>
  );
}



