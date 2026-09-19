import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

export function Field({ label, value, onChangeText, placeholder, keyboardType }: { label?: string; value: string; onChangeText: (t: string) => void; placeholder?: string; keyboardType?: any; }) {
  const colors = useColors();
  return (
    <View style={[styles.wrapper]}>
      {label ? <Text style={[styles.label, { color: colors.muted }]}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 10 },
  label: { fontSize: 13, marginBottom: 6 },
  input: { borderWidth: 1, padding: 10, borderRadius: 8 },
});
