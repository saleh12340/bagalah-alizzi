import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

type Action = {
  icon?: string;
  label?: string;
  color?: string;
  onPress?: () => void;
};

export function ActionRow({ actions }: { actions: Action[] }) {
  const colors = useColors();
  return (
    <View style={[styles.row]}>
      {actions.map((a, i) => (
        <Pressable
          key={i}
          onPress={a.onPress}
          style={({ pressed }) => [
            styles.item,
            { borderColor: colors.border, backgroundColor: colors.surface },
            pressed && { opacity: 0.7 },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: (a.color || colors.primary) + "20" }]}>
            <IconSymbol name={a.icon || "square.grid.2x2"} size={18} color={a.color || colors.primary} />
          </View>
          {a.label ? <Text style={[styles.label, { color: colors.foreground }]}>{a.label}</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row-reverse", gap: 8, alignItems: "center" },
  item: { flexDirection: "row-reverse", alignItems: "center", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1 },
  iconWrap: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center", marginStart: 8 },
  label: { fontSize: 14, fontWeight: "600" },
});
