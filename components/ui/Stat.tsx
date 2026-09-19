import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

export function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.value, { color: accent ? colors.primary : colors.foreground }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 110,
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
  },
});
