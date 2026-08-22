import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function SettingsScreen() {
  const colors = useColors();
  const [storeName, setStoreName] = useState("بقالة العزي للمواد الغذائية");
  const [phone, setPhone] = useState("");
  const [paper, setPaper] = useState<"58mm" | "80mm">("80mm");
  const [showUnitPrice, setShowUnitPrice] = useState(false);
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const save = () => Alert.alert("تم الحفظ", "تم حفظ إعدادات التطبيق.");

  return (
    <ScreenContainer className="px-5 pt-4" safeAreaClassName="bg-background">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.kicker, { color: colors.primary }]}>بقالة العزي</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>الإعدادات</Text>
          </View>
          <View style={[styles.iconBox, { backgroundColor: colors.primary }]}>
            <IconSymbol name="gearshape.fill" size={24} color="#FFFFFF" />
          </View>
        </View>

        <Section title="بيانات المتجر" icon="building.2.fill" colors={colors}>
          <Field label="اسم المتجر" value={storeName} onChangeText={setStoreName} colors={colors} />
          <Field label="رقم الهاتف" value={phone} onChangeText={setPhone} keyboardType="phone-pad" colors={colors} />
        </Section>

        <Section title="الفاتورة والطباعة" icon="printer.fill" colors={colors}>
          <Text style={[styles.label, { color: colors.muted }]}>مقاس الورق الحراري</Text>
          <View style={styles.segment}>
            {(["58mm", "80mm"] as const).map((value) => (
              <Pressable key={value} onPress={() => setPaper(value)} style={[styles.segmentItem, { borderColor: colors.border, backgroundColor: paper === value ? colors.primary : colors.surface }]}>
                <Text style={{ color: paper === value ? "#FFFFFF" : colors.foreground, fontWeight: "700" }}>{value}</Text>
              </Pressable>
            ))}
          </View>
          <SettingRow title="إظهار سعر الوحدة في الإيصال" description="يُستخدم فقط إذا أردت إظهاره للعميل" colors={colors}>
            <Switch value={showUnitPrice} onValueChange={setShowUnitPrice} />
          </SettingRow>
          <SettingRow title="تنبيهات المخزون المنخفض" description="إظهار تنبيه عند الوصول للحد الأدنى" colors={colors}>
            <Switch value={lowStockAlerts} onValueChange={setLowStockAlerts} />
          </SettingRow>
        </Section>

        <Section title="المظهر" icon="paintbrush.fill" colors={colors}>
          <SettingRow title="الوضع الداكن" description="تغيير مظهر التطبيق" colors={colors}>
            <Switch value={darkMode} onValueChange={setDarkMode} />
          </SettingRow>
        </Section>

        <Section title="النسخ الاحتياطي والبيانات" icon="externaldrive.fill" colors={colors}>
          <ActionRow title="نسخ احتياطي للبيانات" subtitle="حفظ نسخة من بيانات البقالة" icon="arrow.down.doc.fill" colors={colors} onPress={() => Alert.alert("النسخ الاحتياطي", "سيتم ربط هذه العملية بقاعدة البيانات في المرحلة التالية.")} />
          <ActionRow title="استعادة البيانات" subtitle="استرجاع نسخة محفوظة" icon="arrow.up.doc.fill" colors={colors} onPress={() => Alert.alert("استعادة البيانات", "سيتم تفعيل الاستعادة بعد ربط التخزين الآمن.")} />
        </Section>

        <Pressable onPress={save} style={({ pressed }) => [styles.save, { backgroundColor: colors.primary }, pressed && { opacity: 0.8 }]}>
          <IconSymbol name="checkmark" size={20} color="#FFFFFF" />
          <Text style={styles.saveText}>حفظ الإعدادات</Text>
        </Pressable>

        <Text style={[styles.version, { color: colors.muted }]}>بقالة العزي • إعدادات التطبيق</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function Section({ title, icon, colors, children }: any) {
  return <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.sectionHead}><View style={[styles.sectionIcon, { backgroundColor: colors.primary + "18" }]}><IconSymbol name={icon} size={19} color={colors.primary} /></View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text></View>{children}</View>;
}

function Field({ label, colors, ...props }: any) {
  return <View style={styles.field}><Text style={[styles.label, { color: colors.muted }]}>{label}</Text><TextInput {...props} placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} /></View>;
}

function SettingRow({ title, description, colors, children }: any) {
  return <View style={[styles.settingRow, { borderTopColor: colors.border }]}><View style={styles.rowText}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.rowSub, { color: colors.muted }]}>{description}</Text></View>{children}</View>;
}

function ActionRow({ title, subtitle, icon, colors, onPress }: any) {
  return <Pressable onPress={onPress} style={[styles.actionRow, { borderTopColor: colors.border }]}><View style={[styles.actionIcon, { backgroundColor: colors.background }]}><IconSymbol name={icon} size={18} color={colors.primary} /></View><View style={styles.rowText}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.rowSub, { color: colors.muted }]}>{subtitle}</Text></View><IconSymbol name="chevron.left" size={18} color={colors.muted} /></Pressable>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40, gap: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  kicker: { fontSize: 13, fontWeight: "800", marginBottom: 2 },
  title: { fontSize: 28, fontWeight: "900" },
  iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  section: { borderWidth: 1, borderRadius: 20, padding: 15, gap: 14 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 17, fontWeight: "900" },
  field: { gap: 7 },
  label: { fontSize: 12, fontWeight: "700" },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, textAlign: "right", fontSize: 15 },
  segment: { flexDirection: "row", gap: 8 },
  segmentItem: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  settingRow: { borderTopWidth: 1, paddingTop: 13, flexDirection: "row", alignItems: "center", gap: 12 },
  actionRow: { borderTopWidth: 1, paddingTop: 13, flexDirection: "row", alignItems: "center", gap: 12 },
  rowText: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 14, fontWeight: "800" },
  rowSub: { fontSize: 11, lineHeight: 17 },
  actionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  save: { minHeight: 52, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saveText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  version: { textAlign: "center", fontSize: 11, marginTop: 4 },
});
