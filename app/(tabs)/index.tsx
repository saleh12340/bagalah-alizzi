import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { shareInvoicePdf } from "@/lib/invoice-sharing";

type Product = { id: string; name: string; category: string; price: number; stock: number; min: number };
type Customer = { id: string; name: string; phone: string; balance: number };

const initialProducts: Product[] = [
  { id: "1", name: "حليب كامل الدسم", category: "ألبان", price: 7.5, stock: 18, min: 10 },
  { id: "2", name: "أرز بسمتي 5 كجم", category: "مواد أساسية", price: 32, stock: 6, min: 8 },
  { id: "3", name: "مياه معدنية  كرتون", category: "مشروبات", price: 14, stock: 24, min: 12 },
  { id: "4", name: "زيت دوار الشمس", category: "مواد أساسية", price: 18, stock: 9, min: 8 },
];
const initialCustomers: Customer[] = [
  { id: "1", name: "أحمد محمد", phone: "050 123 4567", balance: 185 },
  { id: "2", name: "مؤسسة الربيع", phone: "055 987 2100", balance: 920 },
  { id: "3", name: "سالم العتيبي", phone: "053 442 1188", balance: 0 },
];

const money = (value: number) => `${value.toFixed(2)} ر.س`;

export default function HomeScreen() {
  const colors = useColors();
  const [products, setProducts] = useState(initialProducts);
  const [customers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<"home" | "invoice" | "stock" | "customers">("home");
  const [invoiceItems, setInvoiceItems] = useState<{ product: Product; quantity: number }[]>([]);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const lowStock = products.filter((product) => product.stock <= product.min);
  const invoiceTotal = useMemo(
    () => invoiceItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [invoiceItems],
  );
  const filteredProducts = products.filter((product) => product.name.includes(search.trim()));

  const addProduct = (product: Product) => {
    setInvoiceItems((items) => {
      const found = items.find((item) => item.product.id === product.id);
      if (found) return items.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...items, { product, quantity: 1 }];
    });
  };

  const saveInvoice = () => {
    if (!invoiceItems.length) return Alert.alert("الفاتورة فارغة", "أضف منتجًا واحدًا على الأقل قبل الحفظ.");
    setProducts((items) => items.map((product) => {
      const line = invoiceItems.find((item) => item.product.id === product.id);
      return line ? { ...product, stock: Math.max(0, product.stock - line.quantity) } : product;
    }));
    const savedLines = invoiceItems.map((item) => ({ name: item.product.name, quantity: item.quantity, unitPrice: item.product.price }));
    setInvoiceItems([]);
    setShowInvoice(false);
    Alert.alert("تم حفظ الفاتورة", "تم تحديث المخزون وحفظ الفاتورة بنجاح.", [
      { text: "لاحقًا", style: "cancel" },
      { text: "مشاركة PDF عبر واتساب", onPress: () => void shareInvoicePdf(savedLines) },
    ]);
  };

  const title = activeSection === "home" ? "نظرة عامة" : activeSection === "invoice" ? "الفواتير" : activeSection === "stock" ? "المخزون" : "العملاء";

  return (
    <ScreenContainer className="px-5 pt-4" safeAreaClassName="bg-background">
      <View style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.kicker, { color: colors.primary }]}>بقالة العزي</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          </View>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}><IconSymbol name="cart.fill" size={24} color="#FFFFFF" /></View>
        </View>

        {activeSection === "home" && <>
          <View style={[styles.hero, { backgroundColor: colors.primary }]}>
            <View><Text style={styles.heroLabel}>مبيعات اليوم</Text><Text style={styles.heroValue}>1,248.50 ر.س</Text><Text style={styles.heroHint}>↑ 12.4% مقارنة بالأمس</Text></View>
            <View style={styles.heroIcon}><IconSymbol name="chart.bar.fill" size={30} color="#D7F7E9" /></View>
          </View>
          <View style={styles.statsRow}>
            <StatCard label="فواتير اليوم" value="24" icon="doc.text.fill" color={"#2878C8"} />
            <StatCard label="ديون العملاء" value="1,105 ر.س" icon="person.2.fill" color={colors.warning} />
          </View>
          <Pressable onPress={() => setShowInvoice(true)} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.foreground }, pressed && { opacity: 0.8 }]}>
            <IconSymbol name="plus" size={21} color="#FFFFFF" /><Text style={styles.primaryButtonText}>إنشاء فاتورة جديدة</Text>
          </Pressable>
          <SectionHeader title="تنبيهات المخزون" action="عرض الكل" onPress={() => setActiveSection("stock")} colors={colors} />
          {lowStock.slice(0, 2).map((product) => <LowStockRow key={product.id} product={product} colors={colors} />)}
          <SectionHeader title="اختصارات" action="" onPress={() => undefined} colors={colors} />
          <View style={styles.quickGrid}>
            <QuickAction icon="person.badge.plus" label="عميل جديد" color={"#2878C8"} onPress={() => setShowCustomerForm(true)} />
            <QuickAction icon="shippingbox.fill" label="إضافة منتج" color={colors.primary} onPress={() => setActiveSection("stock")} />
            <QuickAction icon="chart.bar.fill" label="التقارير" color="#8B5CF6" onPress={() => Alert.alert("التقارير", "ستتوفر تقارير اليوم والأسبوع والشهر في النسخة التالية.")} />
            <QuickAction icon="ellipsis" label="المزيد" color="#718078" onPress={() => setActiveSection("customers")} />
          </View>
        </>}

        {activeSection === "invoice" && <ListSection title="آخر الفواتير" colors={colors} empty="لا توجد فواتير محفوظة بعد" />}
        {activeSection === "stock" && <>
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="magnifyingglass" size={19} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="ابحث عن منتج" placeholderTextColor={colors.muted} style={[styles.searchInput, { color: colors.foreground }]} /></View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>المنتجات ({filteredProducts.length})</Text>
          <FlatList data={filteredProducts} keyExtractor={(item) => item.id} renderItem={({ item }) => <ProductRow product={item} colors={colors} onAdd={() => addProduct(item)} />} contentContainerStyle={{ gap: 10, paddingBottom: 100 }} />
        </>}
        {activeSection === "customers" && <>
          <Pressable onPress={() => setShowCustomerForm(true)} style={[styles.outlineButton, { borderColor: colors.primary }]}><IconSymbol name="plus" size={18} color={colors.primary} /><Text style={[styles.outlineButtonText, { color: colors.primary }]}>إضافة عميل</Text></Pressable>
          <FlatList data={customers} keyExtractor={(item) => item.id} renderItem={({ item }) => <CustomerRow customer={item} colors={colors} />} contentContainerStyle={{ gap: 10, paddingTop: 14, paddingBottom: 100 }} />
        </>}

        <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TabItem icon="house.fill" label="الرئيسية" active={activeSection === "home"} colors={colors} onPress={() => setActiveSection("home")} />
          <TabItem icon="doc.text.fill" label="الفواتير" active={activeSection === "invoice"} colors={colors} onPress={() => setActiveSection("invoice")} />
          <TabItem icon="person.2.fill" label="العملاء" active={activeSection === "customers"} colors={colors} onPress={() => setActiveSection("customers")} />
          <TabItem icon="shippingbox.fill" label="المخزون" active={activeSection === "stock"} colors={colors} onPress={() => setActiveSection("stock")} />
        </View>
      </View>

      <Modal visible={showInvoice} animationType="slide" transparent onRequestClose={() => setShowInvoice(false)}>
        <View style={styles.modalBackdrop}><View style={[styles.modalCard, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: colors.foreground }]}>فاتورة جديدة</Text><Pressable onPress={() => setShowInvoice(false)}><IconSymbol name="xmark" size={24} color={colors.muted} /></Pressable></View>
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="magnifyingglass" size={19} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="أضف منتجًا بسرعة" placeholderTextColor={colors.muted} style={[styles.searchInput, { color: colors.foreground }]} /></View>
          <FlatList data={filteredProducts} keyExtractor={(item) => item.id} renderItem={({ item }) => <ProductRow product={item} colors={colors} onAdd={() => addProduct(item)} />} style={{ maxHeight: 260 }} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الأصناف المضافة</Text>
          {invoiceItems.map((item) => <View key={item.product.id} style={styles.invoiceLine}><Text style={[styles.lineName, { color: colors.foreground }]}>{item.product.name} × {item.quantity}</Text><Text style={[styles.lineTotal, { color: colors.primary }]}>{money(item.product.price * item.quantity)}</Text></View>)}
          <View style={[styles.totalRow, { borderTopColor: colors.border }]}><Text style={[styles.totalLabel, { color: colors.foreground }]}>الإجمالي</Text><Text style={[styles.totalValue, { color: colors.primary }]}>{money(invoiceTotal)}</Text></View>
          <Pressable onPress={saveInvoice} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={styles.primaryButtonText}>حفظ الفاتورة</Text></Pressable>
        </View></View>
      </Modal>

      <Modal visible={showCustomerForm} animationType="slide" transparent onRequestClose={() => setShowCustomerForm(false)}>
        <View style={styles.modalBackdrop}><View style={[styles.modalCard, { backgroundColor: colors.background }]}><View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: colors.foreground }]}>عميل جديد</Text><Pressable onPress={() => setShowCustomerForm(false)}><IconSymbol name="xmark" size={24} color={colors.muted} /></Pressable></View><TextInput value={customerName} onChangeText={setCustomerName} placeholder="اسم العميل" placeholderTextColor={colors.muted} style={[styles.formInput, { borderColor: colors.border, color: colors.foreground }]} /><TextInput value={customerPhone} onChangeText={setCustomerPhone} placeholder="رقم الهاتف" keyboardType="phone-pad" placeholderTextColor={colors.muted} style={[styles.formInput, { borderColor: colors.border, color: colors.foreground }]} /><Pressable onPress={() => { setShowCustomerForm(false); setCustomerName(""); setCustomerPhone(""); Alert.alert("تمت الإضافة", "تم حفظ بيانات العميل."); }} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={styles.primaryButtonText}>حفظ العميل</Text></Pressable></View></View>
      </Modal>
    </ScreenContainer>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: any; color: string }) { return <View style={styles.statCard}><IconSymbol name={icon} size={20} color={color} /><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>; }
function SectionHeader({ title, action, onPress, colors }: any) { return <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>{action ? <Pressable onPress={onPress}><Text style={[styles.sectionAction, { color: colors.primary }]}>{action}</Text></Pressable> : null}</View>; }
function LowStockRow({ product, colors }: { product: Product; colors: any }) { return <View style={[styles.listRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.productDot, { backgroundColor: colors.warning }]}><IconSymbol name="exclamationmark.triangle.fill" size={17} color="#FFFFFF" /></View><View style={styles.rowMain}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{product.name}</Text><Text style={[styles.rowSub, { color: colors.muted }]}>متبقي {product.stock} وحدات · الحد الأدنى {product.min}</Text></View><Text style={[styles.warningText, { color: colors.warning }]}>منخفض</Text></View>; }
function ProductRow({ product, colors, onAdd }: { product: Product; colors: any; onAdd: () => void }) { return <Pressable onPress={onAdd} style={({ pressed }) => [styles.listRow, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}><View style={[styles.productDot, { backgroundColor: colors.primary }]}><IconSymbol name="shippingbox.fill" size={17} color="#FFFFFF" /></View><View style={styles.rowMain}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{product.name}</Text><Text style={[styles.rowSub, { color: colors.muted }]}>{product.category} · مخزون {product.stock}</Text></View><View style={styles.priceBox}><Text style={[styles.price, { color: colors.primary }]}>{money(product.price)}</Text><IconSymbol name="plus.circle.fill" size={21} color={colors.primary} /></View></Pressable>; }
function CustomerRow({ customer, colors }: { customer: Customer; colors: any }) { return <Pressable onPress={() => Alert.alert("حساب العميل", `رصيد ${customer.name}: ${money(customer.balance)}`)} style={[styles.listRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.avatar, { backgroundColor: "#2878C8" }]}><Text style={styles.avatarText}>{customer.name.slice(0, 1)}</Text></View><View style={styles.rowMain}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{customer.name}</Text><Text style={[styles.rowSub, { color: colors.muted }]}>{customer.phone}</Text></View><Text style={[styles.balance, { color: customer.balance ? colors.error : colors.success }]}>{customer.balance ? money(customer.balance) : "لا يوجد"}</Text></Pressable>; }
function QuickAction({ icon, label, color, onPress }: any) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.quickAction, pressed && { opacity: 0.7 }]}><View style={[styles.quickIcon, { backgroundColor: `${color}18` }]}><IconSymbol name={icon} size={22} color={color} /></View><Text style={styles.quickLabel}>{label}</Text></Pressable>; }
function TabItem({ icon, label, active, colors, onPress }: any) { return <Pressable onPress={onPress} style={styles.tabItem}><IconSymbol name={icon} size={21} color={active ? colors.primary : colors.muted} /><Text style={[styles.tabLabel, { color: active ? colors.primary : colors.muted }]}>{label}</Text></Pressable>; }
function ListSection({ title, colors, empty }: any) { return <View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text><View style={[styles.empty, { borderColor: colors.border }]}><IconSymbol name="doc.text.fill" size={28} color={colors.muted} /><Text style={[styles.emptyText, { color: colors.muted }]}>{empty}</Text></View></View>; }

const styles = StyleSheet.create({ page: { flex: 1, direction: "rtl" }, header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }, kicker: { fontSize: 14, fontWeight: "700", textAlign: "right" }, title: { fontSize: 27, fontWeight: "800", marginTop: 3, textAlign: "right" }, logo: { width: 47, height: 47, borderRadius: 15, alignItems: "center", justifyContent: "center" }, hero: { borderRadius: 22, padding: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }, heroLabel: { color: "#D7F7E9", fontSize: 14, textAlign: "right" }, heroValue: { color: "#FFFFFF", fontSize: 26, fontWeight: "800", marginTop: 8, textAlign: "right" }, heroHint: { color: "#B7E8D3", fontSize: 12, marginTop: 5, textAlign: "right" }, heroIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: "#FFFFFF20", alignItems: "center", justifyContent: "center" }, statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 }, statCard: { flex: 1, padding: 14, borderRadius: 17, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E4EAE6", alignItems: "flex-end", gap: 5 }, statLabel: { color: "#718078", fontSize: 12, textAlign: "right" }, statValue: { color: "#17221D", fontSize: 16, fontWeight: "800", textAlign: "right" }, primaryButton: { minHeight: 54, borderRadius: 17, flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center", marginBottom: 20 }, primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" }, sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, marginTop: 4 }, sectionTitle: { fontSize: 17, fontWeight: "800", textAlign: "right", marginBottom: 10 }, sectionAction: { fontSize: 13, fontWeight: "700" }, listRow: { minHeight: 67, borderRadius: 17, borderWidth: 1, padding: 11, flexDirection: "row-reverse", alignItems: "center", gap: 11, marginBottom: 9 }, productDot: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" }, rowMain: { flex: 1 }, rowTitle: { fontSize: 14, fontWeight: "700", textAlign: "right" }, rowSub: { fontSize: 11, marginTop: 4, textAlign: "right" }, warningText: { fontSize: 11, fontWeight: "800" }, quickGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 }, quickAction: { width: "48%", minHeight: 83, borderRadius: 17, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E4EAE6", padding: 12, flexDirection: "row-reverse", alignItems: "center", gap: 10 }, quickIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" }, quickLabel: { color: "#17221D", fontSize: 13, fontWeight: "700", textAlign: "right" }, tabBar: { position: "absolute", bottom: 8, left: 0, right: 0, height: 68, borderRadius: 22, borderWidth: 1, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 8 }, tabItem: { alignItems: "center", gap: 3, minWidth: 58 }, tabLabel: { fontSize: 10, fontWeight: "700" }, searchBox: { height: 49, borderRadius: 15, borderWidth: 1, flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 13, gap: 8, marginBottom: 16 }, searchInput: { flex: 1, fontSize: 14, textAlign: "right" }, priceBox: { alignItems: "flex-end", gap: 6 }, price: { fontSize: 12, fontWeight: "800" }, outlineButton: { minHeight: 48, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 }, outlineButtonText: { fontWeight: "800" }, balance: { fontSize: 12, fontWeight: "800" }, avatar: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" }, avatarText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" }, modalBackdrop: { flex: 1, backgroundColor: "#00000070", justifyContent: "flex-end" }, modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 28, maxHeight: "90%" }, modalHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }, modalTitle: { fontSize: 22, fontWeight: "800" }, invoiceLine: { flexDirection: "row-reverse", justifyContent: "space-between", paddingVertical: 7 }, lineName: { fontSize: 13, textAlign: "right" }, lineTotal: { fontWeight: "800", fontSize: 13 }, totalRow: { marginTop: 10, paddingTop: 14, borderTopWidth: 1, flexDirection: "row-reverse", justifyContent: "space-between", marginBottom: 15 }, totalLabel: { fontSize: 17, fontWeight: "800" }, totalValue: { fontSize: 19, fontWeight: "900" }, formInput: { height: 52, borderRadius: 15, borderWidth: 1, paddingHorizontal: 14, marginBottom: 12, textAlign: "right", fontSize: 15 }, empty: { minHeight: 200, borderWidth: 1, borderStyle: "dashed", borderRadius: 18, alignItems: "center", justifyContent: "center", gap: 10 }, emptyText: { fontSize: 14 }, }
);
