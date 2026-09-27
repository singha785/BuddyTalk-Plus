import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type RoleOption = {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  gradient: [string, string];
};

const ROLES: RoleOption[] = [
  { id: "common", label: "Common Interview", icon: "message-circle", gradient: ["#5B3DFF", "#3A1F9E"] },
  { id: "software_engineer", label: "Software Engineer", icon: "code", gradient: ["#3FE1B0", "#0E9F7A"] },
  { id: "mechanical_engineer", label: "Mechanical Engineer", icon: "settings", gradient: ["#8FA9FF", "#3D5CC7"] },
  { id: "civil_engineer", label: "Civil Engineer", icon: "layers", gradient: ["#B08968", "#7A5230"] },
  { id: "electrical_engineer", label: "Electrical Engineer", icon: "zap", gradient: ["#FFE066", "#D9A400"] },
  { id: "data_ai_engineer", label: "Data / AI Engineer", icon: "cpu", gradient: ["#9D7BFF", "#5A2FCC"] },
  { id: "devops_engineer", label: "DevOps / Cloud Engineer", icon: "cloud", gradient: ["#6FD3FF", "#1E8FCC"] },
  { id: "product_manager", label: "Product Manager", icon: "clipboard", gradient: ["#FF9AD5", "#C23A93"] },
  { id: "sales", label: "Sales", icon: "trending-up", gradient: ["#FFB47A", "#FF7A45"] },
  { id: "marketing", label: "Marketing", icon: "megaphone", gradient: ["#7E62FF", "#4A2BE0"] },
  { id: "customer_support", label: "Customer Support", icon: "headphones", gradient: ["#FFD66B", "#E59611"] },
  { id: "teacher", label: "Teacher", icon: "book-open", gradient: ["#FF6FA5", "#C23A72"] },
];

export default function ChooseInterviewScreen() {
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: "#1A1530" }}>
        <LinearGradient colors={["#1A1530", "#3A2A66"]} style={StyleSheet.absoluteFill} />
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 20,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.1)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="chevron-down" size={20} color="#FFFFFF" />
          </Pressable>

          <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 24, marginTop: 20 }}>
            Choose Your Interview
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 6 }}>
            Pick a role to practice, or try a common interview.
          </Text>

          <View style={{ marginTop: 24, gap: 12 }}>
            {ROLES.map((role) => (
              <Pressable
                key={role.id}
                onPress={() => router.push({ pathname: "/ai-practice", params: { situation: role.id } })}
              >
                <LinearGradient
                  colors={role.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 18,
                    padding: 18,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: "rgba(255,255,255,0.2)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather name={role.icon} size={20} color="#FFFFFF" />
                  </View>
                  <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 16 }}>
                    {role.label}
                  </Text>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </>
  );
}
