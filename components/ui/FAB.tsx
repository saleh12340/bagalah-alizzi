import React from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export function FAB({ onPress, icon = "plus", style }: { onPress?: () => void; icon?: string; style?: ViewStyle }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={[styles.fab, { backgroundColor: colors.primary }, style]}>
      <IconSymbol name={icon} size={22} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    position: "absolute",
    right: 18,
    bottom: 18,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
});
