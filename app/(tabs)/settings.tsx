import { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type MenuItem = { title: string; icon: string; key: string; description?: string };

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
            <View style={[styles.menuIcon, { backgroundColor: colors.primary }]}><IconSymbol name={item.icon} size={21} color="#fff" /></View>
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
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>{menuTitle}</Text>
                <Pressable onPress={() => setActiveMenu(null)} style={[styles.close, { backgroundColor: colors.surface }]}><Text style={[styles.closeText, { color: colors.foreground }]}>×</Text></Pressable>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {activeMenu === "profile" && <><Field label="اسم المحل" value={storeName} onChangeText={setStoreName} colors={colors}/><Field label="رقم الهاتف" value={phone} onChangeText={setPhone} keyboardType="phone-pad" colors={colors}/><Field label="العنوان" value={address} onChangeText={setAddress} colors={colors}/><Field label="العملة" value={currency} onChangeText={setCurrency} colors={colors}/></>}
                {activeMenu === "printing" && <><OptionRow title="مقاس الورق" colors={colors}><View style={styles.segment}>{(["58mm", "80mm"] as const).map(v => <Pressable key={v} onPress={() => setPaper(v)} style={[styles.segmentItem, { borderColor: colors.border, backgroundColor: paper === v ? colors.primary : colors.surface }]}><Text style={{ color: paper === v ? "#fff" : colors.foreground, fontWeight: "900" }}>{v}</Text></Pressable>)}</View></OptionRow><OptionRow title="الطباعة التلقائية" colors={colors}><Switch value={autoPrint} onValueChange={setAutoPrint}/></OptionRow><OptionRow title="إظهار الشعار" colors={colors}><Switch value={showLogo} onValueChange={setShowLogo}/></OptionRow><OptionRow title="إظهار سعر الوحدة" colors={colors}><Switch value={showUnitPrice} onValueChange={setShowUnitPrice}/></OptionRow><Field label="عدد النسخ" value={copies} onChangeText={setCopies} keyboardType="number-pad" colors={colors}/></>}
                {activeMenu === "thermal" && <><Text style={[styles.help, { color: colors.muted }]}>إعدادات الطابعة الحرارية الصغيرة. اختر المقاس أولًا، ثم اربط الطابعة من إعدادات Bluetooth في الهاتف.</Text><OptionRow title="مقاس الطباعة الحالي" colors={colors}><Text style={[styles.value, { color: colors.primary }]}>{paper}</Text></OptionRow><Pressable onPress={() => setNotice("سيتم فتح إعداد الربط بالطابعة عند توفر خدمة Bluetooth الأصلية", "success")} style={[styles.action, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.actionText, { color: colors.foreground }]}>اختبار الطابعة</Text></Pressable></>}
                {activeMenu === "backup" && <><Text style={[styles.help, { color: colors.muted }]}>حفظ واستعادة بيانات التطبيق محليًا. لن يتم حذف بياناتك الحالية عند إنشاء نسخة احتياطية.</Text><Pressable onPress={() => setNotice("النسخ الاحتياطي سيحفظ بيانات التطبيق في خطوة المشاركة التالية", "success")} style={[styles.action, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.actionText, { color: colors.foreground }]}>إنشاء نسخة احتياطية</Text></Pressable><Pressable onPress={() => setNotice("اختر ملف النسخة الاحتياطية لاستعادته", "success")} style={[styles.action, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.actionText, { color: colors.foreground }]}>استعادة نسخة</Text></Pressable></>}
                {activeMenu === "notifications" && <><OptionRow title="تفعيل الإشعارات" colors={colors}><Switch value={notifications} onValueChange={setNotifications}/></OptionRow><OptionRow title="تنبيه المخزون المنخفض" colors={colors}><Switch value={lowStockAlerts} onValueChange={setLowStockAlerts}/></OptionRow><Text style={[styles.help, { color: colors.muted }]}>تم تصميم رسائل النجاح والخطأ لتظهر داخل التطبيق في شريط واضح من اليمين إلى اليسار بدل أن يغطي Alert لوحة الإدخال أو الكيبورد.</Text></>}
                {activeMenu === "tax" && <><OptionRow title="تفعيل الضريبة" colors={colors}><Switch value={taxEnabled} onValueChange={setTaxEnabled}/></OptionRow><Field label="نسبة الضريبة %" value={taxRate} onChangeText={setTaxRate} keyboardType="decimal-pad" colors={colors}/></>}
                {activeMenu === "other" && <><Text style={[styles.help, { color: colors.muted }]}>إعدادات عامة للتطبيق وواجهة الاستخدام.</Text><OptionRow title="اتجاه الواجهة" colors={colors}><Text style={[styles.value, { color: colors.primary }]}>العربية RTL</Text></OptionRow><OptionRow title="لوحة المفاتيح" colors={colors}><Text style={[styles.value, { color: colors.primary }]}>تمرير تلقائي للحقول</Text></OptionRow></>}
              </ScrollView>
              <Pressable onPress={() => { setActiveMenu(null); save(); }} style={[styles.modalSave, { backgroundColor: colors.primary }]}><Text style={styles.saveText}>حفظ والعودة</Text></Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

function Field({ label, colors, ...props }: any) { return <View style={styles.field}><Text style={[styles.label, { color: colors.muted }]}>{label}</Text><TextInput {...props} placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} textAlign="right"/></View>; }
function OptionRow({ title, colors, children }: any) { return <View style={[styles.optionRow, { borderBottomColor: colors.border }]}><Text style={[styles.optionTitle, { color: colors.foreground }]}>{title}</Text>{children}</View>; }

const styles = StyleSheet.create({
  header: { height: 88, flexDirection: "row", alignItems: "center", paddingHorizontal: 22, gap: 18 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, color: "#fff", fontSize: 25, fontWeight: "900", textAlign: "right" },
  headerSpacer: { width: 44 },
  list: { paddingBottom: 18 },
  menuRow: { minHeight: 74, flexDirection: "row", alignItems: "center", paddingHorizontal: 17, gap: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  menuIcon: { width: 43, height: 43, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  menuText: { flex: 1, fontSize: 18, fontWeight: "700", textAlign: "right" },
  saveButton: { marginHorizontal: 18, marginBottom: 10, minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  notice: { position: "absolute", left: 16, right: 16, bottom: 76, minHeight: 54, borderRadius: 15, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 10, elevation: 8 },
  noticeText: { color: "#fff", fontSize: 14, fontWeight: "800", textAlign: "right", flex: 1 },
  modalRoot: { flex: 1 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.42)", justifyContent: "flex-end" },
  modalCard: { maxHeight: "88%", minHeight: 280, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 17 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  modalTitle: { flex: 1, fontSize: 21, fontWeight: "900", textAlign: "right" },
  close: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 30, lineHeight: 32 },
  modalScroll: { paddingBottom: 18, gap: 15 },
  field: { gap: 7, marginTop: 8 },
  label: { fontSize: 13, fontWeight: "800", textAlign: "right" },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 15 },
  optionRow: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  optionTitle: { flex: 1, fontSize: 15, fontWeight: "800", textAlign: "right" },
  segment: { flexDirection: "row", gap: 8, flex: 1 },
  segmentItem: { flex: 1, minHeight: 45, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  value: { fontSize: 14, fontWeight: "900" },
  help: { fontSize: 13, lineHeight: 21, textAlign: "right", paddingVertical: 8 },
  action: { minHeight: 50, borderWidth: 1, borderRadius: 13, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  actionText: { fontSize: 15, fontWeight: "900" },
  modalSave: { minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 8 },
});
