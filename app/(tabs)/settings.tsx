import { useEffect, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function SettingsScreen() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const { data } = trpc.settings.get.useQuery();
  const update = trpc.settings.update.useMutation({ onSuccess: () => { utils.settings.get.invalidate(); Alert.alert("تم الحفظ", "تم حفظ إعدادات المتجر والطباعة."); }, onError: (e) => Alert.alert("تعذر الحفظ", e.message) });
  const [storeName, setStoreName] = useState("بقالة العزي للمواد الغذائية");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("ر.س");
  const [paper, setPaper] = useState<"58mm" | "80mm">("80mm");
  const [showUnitPrice, setShowUnitPrice] = useState(false);
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [autoPrint, setAutoPrint] = useState(false);
  const [copies, setCopies] = useState("1");
  const [showLogo, setShowLogo] = useState(true);

  useEffect(() => { if (!data) return; setStoreName(data.storeName); setPhone(data.phone ?? ""); setAddress(data.address ?? ""); setCurrency(data.currency); setPaper(data.receiptWidth); }, [data]);
  const save = () => update.mutate({ storeName: storeName.trim(), phone: phone.trim() || undefined, address: address.trim() || undefined, currency: currency.trim() || "ر.س", receiptWidth: paper });

  return (
    <ScreenContainer className="px-4 pt-3" safeAreaClassName="bg-background">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={{ flex: 1 }}><Text style={[styles.kicker, { color: colors.primary }]}>إدارة المتجر</Text><Text style={[styles.title, { color: colors.foreground }]}>الإعدادات</Text><Text style={[styles.subtitle, { color: colors.muted }]}>كل إعدادات بقالة العزي في مكان واحد</Text></View>
            <View style={[styles.heroIcon, { backgroundColor: colors.primary }]}><IconSymbol name="gearshape.fill" size={25} color="#fff" /></View>
          </View>

          <Section title="بيانات المحل" subtitle="المعلومات التي تظهر في الفواتير والتقارير" icon="building.2.fill" colors={colors}>
            <Field label="اسم المحل" value={storeName} onChangeText={setStoreName} colors={colors} />
            <Field label="رقم الهاتف" value={phone} onChangeText={setPhone} keyboardType="phone-pad" colors={colors} />
            <Field label="العنوان" value={address} onChangeText={setAddress} colors={colors} />
            <Field label="العملة" value={currency} onChangeText={setCurrency} colors={colors} />
            <Pressable onPress={() => Alert.alert("الشعار", "سيتم ربط اختيار صورة الشعار في خطوة الطباعة التالية.")} style={[styles.action, { backgroundColor: colors.background, borderColor: colors.border }]}><IconSymbol name="photo" size={20} color={colors.primary} /><Text style={[styles.actionText, { color: colors.foreground }]}>تعديل شعار المحل</Text><IconSymbol name="chevron.left" size={18} color={colors.muted} /></Pressable>
          </Section>

          <Section title="الطابعة والفاتورة" subtitle="إعدادات الإيصال الحراري والطباعة" icon="printer.fill" colors={colors}>
            <Text style={[styles.label, { color: colors.muted }]}>مقاس الورق</Text>
            <View style={styles.segment}>{(["58mm", "80mm"] as const).map(v => <Pressable key={v} onPress={() => setPaper(v)} style={[styles.segmentItem, { borderColor: colors.border, backgroundColor: paper === v ? colors.primary : colors.background }]}><Text style={{ color: paper === v ? "#fff" : colors.foreground, fontWeight: "900" }}>{v}</Text></Pressable>)}</View>
            <SettingRow title="الطباعة التلقائية" description="طباعة الإيصال بعد حفظ الفاتورة" colors={colors}><Switch value={autoPrint} onValueChange={setAutoPrint} /></SettingRow>
            <SettingRow title="إظهار الشعار" description="إظهار شعار المحل أعلى الإيصال" colors={colors}><Switch value={showLogo} onValueChange={setShowLogo} /></SettingRow>
            <SettingRow title="إظهار سعر الوحدة" description="عرض السعر بجانب الصنف في الإيصال" colors={colors}><Switch value={showUnitPrice} onValueChange={setShowUnitPrice} /></SettingRow>
            <Field label="عدد نسخ الإيصال" value={copies} onChangeText={setCopies} keyboardType="number-pad" colors={colors} />
          </Section>

          <Section title="التقارير والمخزون" subtitle="التحكم في التنبيهات وطريقة عرض النتائج" icon="chart.bar.fill" colors={colors}>
            <SettingRow title="تنبيه المخزون المنخفض" description="تنبيه عند وصول الصنف للحد الأدنى" colors={colors}><Switch value={lowStockAlerts} onValueChange={setLowStockAlerts} /></SettingRow>
            <ActionRow title="التقارير اليومية والشهرية والسنوية" subtitle="تقارير المبيعات والمشتريات والمصروفات والأرباح" icon="chart.pie.fill" colors={colors} onPress={() => Alert.alert("التقارير", "يمكنك فتح تبويب التقارير لاختيار الفترة المطلوبة.")} />
          </Section>

          <Section title="البيانات والنسخ الاحتياطي" subtitle="حماية بيانات البقالة وإدارتها" icon="externaldrive.fill" colors={colors}>
            <ActionRow title="نسخ احتياطي" subtitle="حفظ نسخة آمنة من بيانات التطبيق" icon="arrow.down.doc.fill" colors={colors} onPress={() => Alert.alert("النسخ الاحتياطي", "سيتم تنفيذ النسخ الاحتياطي من قاعدة البيانات في المرحلة التالية.")} />
            <ActionRow title="استعادة البيانات" subtitle="استرجاع نسخة محفوظة" icon="arrow.up.doc.fill" colors={colors} onPress={() => Alert.alert("استعادة البيانات", "اختر ملف النسخة الاحتياطية لاستعادته.")} />
            <ActionRow title="تحديث البيانات" subtitle="إعادة تحميل البيانات من الخادم" icon="arrow.clockwise" colors={colors} onPress={() => { utils.invalidate(); Alert.alert("تم التحديث", "تم طلب تحديث بيانات التطبيق."); }} />
          </Section>

          <Pressable disabled={update.isPending} onPress={save} style={({ pressed }) => [styles.save, { backgroundColor: colors.primary }, pressed && { opacity: 0.8 }, update.isPending && { opacity: 0.6 }]}><IconSymbol name="checkmark" size={20} color="#fff" /><Text style={styles.saveText}>{update.isPending ? "جارٍ الحفظ..." : "حفظ الإعدادات"}</Text></Pressable>
          <Text style={[styles.version, { color: colors.muted }]}>بقالة العزي • إعدادات احترافية</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function Section({ title, subtitle, icon, colors, children }: any) { return <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.sectionHead}><View style={[styles.sectionIcon, { backgroundColor: colors.primary + "18" }]}><IconSymbol name={icon} size={19} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.sectionSub, { color: colors.muted }]}>{subtitle}</Text></View></View>{children}</View>; }
function Field({ label, colors, ...props }: any) { return <View style={styles.field}><Text style={[styles.label, { color: colors.muted }]}>{label}</Text><TextInput {...props} placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} /> </View>; }
function SettingRow({ title, description, colors, children }: any) { return <View style={[styles.settingRow, { borderTopColor: colors.border }]}><View style={styles.rowText}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.rowSub, { color: colors.muted }]}>{description}</Text></View>{children}</View>; }
function ActionRow({ title, subtitle, icon, colors, onPress }: any) { return <Pressable onPress={onPress} style={[styles.actionRow, { borderTopColor: colors.border }]}><View style={[styles.actionIcon, { backgroundColor: colors.background }]}><IconSymbol name={icon} size={18} color={colors.primary} /></View><View style={styles.rowText}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.rowSub, { color: colors.muted }]}>{subtitle}</Text></View><IconSymbol name="chevron.left" size={18} color={colors.muted} /></Pressable>; }
const styles = StyleSheet.create({ content: { paddingBottom: 42, gap: 14 }, hero: { flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 12 }, kicker: { fontSize: 13, fontWeight: "900", marginBottom: 2 }, title: { fontSize: 30, fontWeight: "900" }, subtitle: { fontSize: 12, marginTop: 3 }, heroIcon: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center" }, section: { borderWidth: 1, borderRadius: 22, padding: 15, gap: 14 }, sectionHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 1 }, sectionIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" }, sectionTitle: { fontSize: 17, fontWeight: "900" }, sectionSub: { fontSize: 11, marginTop: 2, lineHeight: 16 }, field: { gap: 7 }, label: { fontSize: 12, fontWeight: "800" }, input: { minHeight: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, textAlign: "right", fontSize: 15 }, segment: { flexDirection: "row", gap: 8 }, segmentItem: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 13, alignItems: "center", justifyContent: "center" }, settingRow: { borderTopWidth: 1, paddingTop: 13, flexDirection: "row", alignItems: "center", gap: 12 }, actionRow: { borderTopWidth: 1, paddingTop: 13, flexDirection: "row", alignItems: "center", gap: 12 }, action: { minHeight: 48, borderWidth: 1, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 13 }, actionText: { flex: 1, fontSize: 14, fontWeight: "900" }, rowText: { flex: 1, gap: 3 }, rowTitle: { fontSize: 14, fontWeight: "900" }, rowSub: { fontSize: 11, lineHeight: 17 }, actionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" }, save: { minHeight: 54, borderRadius: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, saveText: { color: "#fff", fontSize: 16, fontWeight: "900" }, version: { textAlign: "center", fontSize: 11, marginTop: 2 } });