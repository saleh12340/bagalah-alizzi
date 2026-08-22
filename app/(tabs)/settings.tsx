import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type MenuItem = { title: string; icon: string; key: string; description?: string };
type IconName = ComponentProps<typeof IconSymbol>["name"];

const menuItems: MenuItem[] = [
  { title: "البيانات الشخصية", icon: "person.crop.rectangle.fill", key: "profile" },
  { title: "خيارات الطباعة", icon: "printer.fill", key: "printing" },
  { title: "خيارات الأمان", icon: "lock.fill", key: "security" },
  { title: "المستخدمين والصلاحيات", icon: "person.2.fill", key: "users" },
  { title: "التصنيفات", icon: "square.grid.2x2.fill", key: "categories" },
  { title: "مجموعة الصنف", icon: "cart.fill", key: "groups" },
  { title: "وحدات القياس", icon: "cube.fill", key: "units" },
  { title: "خيارات حفظ البيانات", icon: "externaldrive.fill", key: "backup" },
  { title: "الطابعة الحرارية", icon: "printer.fill", key: "thermal" },
  { title: "الضريبة", icon: "percent", key: "tax" },
  { title: "طابعة باركود الأصناف", icon: "barcode.viewfinder", key: "barcode" },
  { title: "خيارات الإشعارات", icon: "bell.fill", key: "notifications" },
  { title: "خيارات أخرى", icon: "ellipsis.circle.fill", key: "other" },
  { title: "تفعيل الاشتراك", icon: "person.badge.key.fill", key: "subscription" },
];

export default function SettingsScreen() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const { data } = trpc.settings.get.useQuery();
  const update = trpc.settings.update.useMutation({
    onSuccess: () => { utils.settings.get.invalidate(); setNotice("تم حفظ الإعدادات بنجاح", "success"); },
    onError: (e) => setNotice(e.message || "تعذر حفظ الإعدادات", "error"),
  });
  const [storeName, setStoreName] = useState("بقالة العزي للمواد الغذائية");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("ر.س");
  const [paper, setPaper] = useState<"58mm" | "80mm">("80mm");
  const [autoPrint, setAutoPrint] = useState(false);
  const [showLogo, setShowLogo] = useState(true);
  const [showUnitPrice, setShowUnitPrice] = useState(false);
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState("0");
  const [copies, setCopies] = useState("1");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [notice, setNoticeState] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const setNotice = (text: string, type: "success" | "error") => {
    setNoticeState({ text, type });
    setTimeout(() => setNoticeState(null), 2600);
  };

  useEffect(() => {
    if (!data) return;
    setStoreName(data.storeName || "بقالة العزي للمواد الغذائية");
    setPhone(data.phone ?? "");
    setAddress(data.address ?? "");
    setCurrency(data.currency || "ر.س");
    setPaper(data.receiptWidth === "58mm" ? "58mm" : "80mm");
  }, [data]);

  const save = () => update.mutate({ storeName: storeName.trim(), phone: phone.trim() || undefined, address: address.trim() || undefined, currency: currency.trim() || "ر.س", receiptWidth: paper });

  const menuTitle = useMemo(() => menuItems.find(x => x.key === activeMenu)?.title ?? "", [activeMenu]);

  const openMenu = (key: string) => {
    if (["profile", "printing", "thermal", "backup", "notifications", "tax", "other"].includes(key)) setActiveMenu(key);
    else Alert.alert("الإعدادات", `قسم ${menuItems.find(x => x.key === key)?.title} جاهز للربط مع بيانات التطبيق.`);
  };

  return (
    <ScreenContainer className="px-0 pt-0" safeAreaClassName="bg-background">
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Pressable onPress={() => setActiveMenu(null)} style={styles.back}><IconSymbol name="chevron.right" size={29} color="#fff" /></Pressable>
        <Text style={styles.headerTitle}>إعدادات</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {menuItems.map(item => (
          <Pressable key={item.key} onPress={() => openMenu(item.key)} style={({ pressed }) => [styles.menuRow, { borderBottomColor: colors.border, backgroundColor: colors.background }, pressed && { opacity: 0.65 }]}>
            <View style={[styles.menuIcon, { backgroundColor: colors.primary }]}><IconSymbol name={item.icon as IconName} size={21} color="#fff" /></View>
            <Text style={[styles.menuText, { color: colors.foreground }]}>{item.title}</Text>
            <IconSymbol name="chevron.left" size={18} color={colors.muted} />
          </Pressable>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Pressable onPress={save} disabled={update.isPending} style={[styles.saveButton, { backgroundColor: colors.primary }, update.isPending && { opacity: 0.6 }]}>
        <Text style={styles.saveText}>{update.isPending ? "جارٍ الحفظ..." : "حفظ الإعدادات"}</Text>
      </Pressable>

      {notice && <View pointerEvents="none" style={[styles.notice, { backgroundColor: notice.type === "error" ? "#B42318" : colors.primary }]}><IconSymbol name={notice.type === "error" ? "exclamationmark.triangle.fill" : "checkmark.circle.fill"} size={19} color="#fff" /><Text style={styles.noticeText}>{notice.text}</Text></View>}

      <Modal visible={!!activeMenu} transparent animationType="slide" onRequestClose={() => setActiveMenu(null)}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === "android" ? "height" : "padding"}>
          <Pressable style={styles.modalBackdrop} onPress={() => setActiveMenu(null)} />
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{menuTitle}</Text>
              <Pressable onPress={() => setActiveMenu(null)} style={styles.close}><Text style={{ fontSize: 25, color: colors.muted }}>×</Text></Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.form}>
              {activeMenu === "profile" && <>
                <Text style={[styles.label, { color: colors.foreground }]}>اسم المحل</Text><TextInput value={storeName} onChangeText={setStoreName} style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} />
                <Text style={[styles.label, { color: colors.foreground }]}>رقم الهاتف</Text><TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} />
                <Text style={[styles.label, { color: colors.foreground }]}>العنوان</Text><TextInput value={address} onChangeText={setAddress} style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} />
              </>}
              {activeMenu === "printing" && <>
                <Text style={[styles.label, { color: colors.foreground }]}>مقاس الورق الحراري</Text><View style={styles.segment}><Pressable onPress={() => setPaper("58mm")} style={[styles.seg, paper === "58mm" && { backgroundColor: colors.primary }]}><Text style={{ color: paper === "58mm" ? "#fff" : colors.foreground }}>58mm</Text></Pressable><Pressable onPress={() => setPaper("80mm")} style={[styles.seg, paper === "80mm" && { backgroundColor: colors.primary }]}><Text style={{ color: paper === "80mm" ? "#fff" : colors.foreground }}>80mm</Text></Pressable></View>
                <Row label="طباعة تلقائية" value={autoPrint} onChange={setAutoPrint} /><Row label="إظهار الشعار" value={showLogo} onChange={setShowLogo} /><Row label="إظهار سعر الوحدة" value={showUnitPrice} onChange={setShowUnitPrice} />
              </>}
              {activeMenu === "thermal" && <><Text style={[styles.help, { color: colors.muted }]}>يمكن ضبط الطابعة الحرارية الصغيرة من هنا، وستبقى الإعدادات محفوظة على الجهاز.</Text><Row label="الطابعة الحرارية مفعلة" value={autoPrint} onChange={setAutoPrint} /></>}
              {activeMenu === "backup" && <Text style={[styles.help, { color: colors.muted }]}>البيانات المحلية تحفظ على الجهاز. لن يتم استبدالها تلقائيًا. استخدم النسخ الاحتياطي قبل إعادة ضبط البيانات.</Text>}
              {activeMenu === "notifications" && <><Row label="الإشعارات" value={notifications} onChange={setNotifications} /><Row label="تنبيه المخزون المنخفض" value={lowStockAlerts} onChange={setLowStockAlerts} /></>}
              {activeMenu === "tax" && <><Row label="تفعيل الضريبة" value={taxEnabled} onChange={setTaxEnabled} /><Text style={[styles.label, { color: colors.foreground }]}>نسبة الضريبة</Text><TextInput value={taxRate} onChangeText={setTaxRate} keyboardType="decimal-pad" style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} /></>}
              {activeMenu === "other" && <><Text style={[styles.label, { color: colors.foreground }]}>عدد نسخ الفاتورة</Text><TextInput value={copies} onChangeText={setCopies} keyboardType="number-pad" style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} /></>}
              <View style={{ height: 20 }} />
              <Pressable onPress={save} disabled={update.isPending} style={[styles.saveSheet, { backgroundColor: colors.primary }]}><Text style={styles.saveText}>{update.isPending ? "جارٍ الحفظ..." : "حفظ"}</Text></Pressable>
              <View style={{ height: 80 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

function Row({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return <View style={styles.row}><Text style={styles.rowText}>{label}</Text><Switch value={value} onValueChange={onChange} /></View>;
}

const styles = StyleSheet.create({
  header: { height: 112, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 28, fontWeight: "800", textAlign: "center" },
  headerSpacer: { width: 44 },
  list: { paddingBottom: 80 },
  menuRow: { minHeight: 72, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", borderBottomWidth: 1 },
  menuIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", marginRight: 14 },
  menuText: { flex: 1, fontSize: 20, textAlign: "left" },
  saveButton: { marginHorizontal: 18, marginBottom: 12, height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  saveSheet: { height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  saveText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  notice: { position: "absolute", left: 14, right: 14, bottom: 20, minHeight: 48, borderRadius: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8, zIndex: 10000 },
  noticeText: { flex: 1, color: "#fff", fontSize: 13, textAlign: "right" },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { maxHeight: "88%", borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: "hidden" },
  sheetHeader: { minHeight: 66, paddingHorizontal: 18, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontSize: 22, fontWeight: "800" },
  close: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#eee", alignItems: "center", justifyContent: "center" },
  form: { paddingHorizontal: 18, paddingBottom: 40 },
  label: { fontSize: 16, fontWeight: "700", marginTop: 12, marginBottom: 7, textAlign: "right" },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 17, textAlign: "right" },
  help: { fontSize: 15, lineHeight: 24, textAlign: "right", padding: 12 },
  segment: { flexDirection: "row", gap: 8 },
  seg: { flex: 1, minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: "#ddd", alignItems: "center", justifyContent: "center" },
  row: { minHeight: 58, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#eee" },
  rowText: { fontSize: 16, textAlign: "right" },
});
