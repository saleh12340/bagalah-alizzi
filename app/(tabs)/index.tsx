import { useMemo, useState } from "react";
import { Alert, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { shareInvoicePdf } from "@/lib/invoice-sharing";

type Section = "home" | "invoice" | "stock" | "customers" | "reports" | "expenses" | "settings";
type DraftLine = { productId: number; name: string; quantity: number; price: number; stock: number };
const money = (v: number | string) => `${Number(v || 0).toFixed(2)} ر.س`;
const todayRange = () => { const from = new Date(); from.setHours(0, 0, 0, 0); const to = new Date(from); to.setDate(to.getDate() + 1); return { from, to }; };

export default function HomeScreen() {
  const colors = useColors();
  const [section, setSection] = useState<Section>("home");
  const [search, setSearch] = useState("");
  const [showInvoice, setShowInvoice] = useState(false);
  const [showCustomer, setShowCustomer] = useState(false);
  const [showProduct, setShowProduct] = useState(false);
  const [invoiceLines, setInvoiceLines] = useState<DraftLine[]>([]);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [productName, setProductName] = useState("");
  const [productPurchase, setProductPurchase] = useState("");
  const [productSale, setProductSale] = useState("");
  const [productStock, setProductStock] = useState("");
  const [productMin, setProductMin] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");

  const productsQ = trpc.products.list.useQuery({ search: search || undefined });
  const customersQ = trpc.customers.list.useQuery({ search: search || undefined });
  const invoicesQ = trpc.sales.recent.useQuery({ limit: 30 });
  const reportQ = trpc.reports.summary.useQuery(todayRange());
  const expensesQ = trpc.expenses.list.useQuery();
  const createCustomer = trpc.customers.create.useMutation({ onSuccess: () => { customersQ.refetch(); setShowCustomer(false); setCustomerName(""); setCustomerPhone(""); Keyboard.dismiss(); Alert.alert("تم الحفظ", "تمت إضافة العميل إلى قاعدة البيانات."); } });
  const createProduct = trpc.products.create.useMutation({ onSuccess: () => { productsQ.refetch(); setShowProduct(false); setProductName(""); setProductPurchase(""); setProductSale(""); setProductStock(""); setProductMin(""); Keyboard.dismiss(); Alert.alert("تم الحفظ", "تمت إضافة الصنف وتسجيل رصيده الافتتاحي."); } });
  const createSale = trpc.sales.create.useMutation({ onSuccess: async (data) => { productsQ.refetch(); customersQ.refetch(); invoicesQ.refetch(); reportQ.refetch(); setInvoiceLines([]); setCustomerId(null); setShowInvoice(false); Keyboard.dismiss(); Alert.alert("تم حفظ الفاتورة", `رقم ${data.invoiceNo}\nالإجمالي ${money(data.total)}`, [{ text: "إغلاق" }, { text: "طباعة / مشاركة", onPress: () => void shareInvoicePdf(data.items, undefined) }]); } });
  const createExpense = trpc.expenses.create.useMutation({ onSuccess: () => { expensesQ.refetch(); reportQ.refetch(); setExpenseCategory(""); setExpenseAmount(""); Keyboard.dismiss(); Alert.alert("تم الحفظ", "تم تسجيل المصروف."); } });

  const products = productsQ.data ?? [];
  const customers = customersQ.data ?? [];
  const invoices = invoicesQ.data ?? [];
  const lowStock = products.filter((p) => Number(p.stock) <= Number(p.minStock));
  const draftTotal = useMemo(() => invoiceLines.reduce((s, x) => s + x.quantity * x.price, 0), [invoiceLines]);
  const title = { home: "نظرة عامة", invoice: "الفواتير", stock: "المخزون والأصناف", customers: "العملاء والحسابات", reports: "التقارير", expenses: "المصروفات", settings: "الإعدادات" }[section];

  const addLine = (p: (typeof products)[number]) => setInvoiceLines((old) => { const found = old.find((x) => x.productId === p.id); if (found) return old.map((x) => x.productId === p.id ? { ...x, quantity: x.quantity + 1 } : x); return [...old, { productId: p.id, name: p.name, quantity: 1, price: Number(p.salePrice), stock: Number(p.stock) }]; });
  const saveCustomer = () => { if (!customerName.trim()) return Alert.alert("تنبيه", "اكتب اسم العميل."); createCustomer.mutate({ name: customerName.trim(), phone: customerPhone.trim() || undefined, openingBalance: 0 }); };
  const saveProduct = () => { const sale = Number(productSale); if (!productName.trim() || !Number.isFinite(sale) || sale < 0) return Alert.alert("تنبيه", "أدخل اسم الصنف وسعر بيع صحيح."); createProduct.mutate({ name: productName.trim(), purchasePrice: Number(productPurchase) || 0, salePrice: sale, stock: Number(productStock) || 0, minStock: Number(productMin) || 0, unit: "حبة" }); };
  const saveInvoice = () => { if (!invoiceLines.length) return Alert.alert("الفاتورة فارغة", "أضف صنفًا واحدًا على الأقل."); const invalid = invoiceLines.find((x) => x.quantity > x.stock); if (invalid) return Alert.alert("المخزون غير كافٍ", `${invalid.name}: المتوفر ${invalid.stock}`); createSale.mutate({ customerId, paymentType: customerId ? "credit" : "cash", paid: customerId ? 0 : draftTotal, discount: 0, items: invoiceLines.map((x) => ({ productId: x.productId, quantity: x.quantity })) }); };

  return (
    <ScreenContainer className="px-4 pt-3" safeAreaClassName="bg-background">
      <View style={styles.page}>
        <View style={styles.header}>
          <View><Text style={[styles.brand, { color: colors.primary }]}>بقالة العزي</Text><Text style={[styles.title, { color: colors.foreground }]}>{title}</Text></View>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}><IconSymbol name="cart.fill" size={24} color="#fff" /></View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {section === "home" && <Home colors={colors} report={reportQ.data} lowStock={lowStock} onInvoice={() => setShowInvoice(true)} onCustomer={() => setShowCustomer(true)} onProduct={() => setShowProduct(true)} onSection={setSection} />}
          {section === "invoice" && <Invoices colors={colors} invoices={invoices} onNew={() => setShowInvoice(true)} />}
          {section === "stock" && <Stock colors={colors} products={products} lowStock={lowStock} search={search} setSearch={setSearch} onAdd={() => setShowProduct(true)} onInvoice={addLine} />}
          {section === "customers" && <Customers colors={colors} customers={customers} search={search} setSearch={setSearch} onAdd={() => setShowCustomer(true)} />}
          {section === "reports" && <Reports colors={colors} report={reportQ.data} />}
          {section === "expenses" && <Expenses colors={colors} expenses={expensesQ.data ?? []} category={expenseCategory} amount={expenseAmount} setCategory={setExpenseCategory} setAmount={setExpenseAmount} onSave={() => { const amount = Number(expenseAmount); if (!expenseCategory.trim() || !amount) return Alert.alert("تنبيه", "أدخل نوع المصروف والمبلغ."); createExpense.mutate({ category: expenseCategory.trim(), amount }); }} />}
          {section === "settings" && <Settings colors={colors} />}
          <View style={{ height: 90 }} />
        </ScrollView>

        <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Tab icon="house.fill" label="الرئيسية" active={section === "home"} colors={colors} onPress={() => setSection("home")} />
          <Tab icon="doc.text.fill" label="الفواتير" active={section === "invoice"} colors={colors} onPress={() => setSection("invoice")} />
          <Tab icon="person.2.fill" label="العملاء" active={section === "customers"} colors={colors} onPress={() => setSection("customers")} />
          <Tab icon="shippingbox.fill" label="المخزون" active={section === "stock"} colors={colors} onPress={() => setSection("stock")} />
          <Tab icon="ellipsis" label="المزيد" active={section === "reports" || section === "expenses" || section === "settings"} colors={colors} onPress={() => setSection("reports")} />
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardLayer} pointerEvents="box-none">
        <Modal visible={showInvoice} animationType="slide" transparent onRequestClose={() => setShowInvoice(false)} statusBarTranslucent>
          <View style={styles.backdrop}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalKeyboard}>
              <View style={[styles.modal, { backgroundColor: colors.background }]}>
                <ModalHeader title="فاتورة مبيعات جديدة" colors={colors} close={() => { Keyboard.dismiss(); setShowInvoice(false); }} />
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                  <Text style={[styles.label, { color: colors.muted }]}>اختر العميل (اختياري)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingVertical: 6 }}>
                    <Pill label="نقدي" active={customerId === null} colors={colors} onPress={() => setCustomerId(null)} />
                    {customers.slice(0, 10).map((c) => <Pill key={c.id} label={c.name} active={customerId === c.id} colors={colors} onPress={() => setCustomerId(c.id)} />)}
                  </ScrollView>
                  <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="magnifyingglass" size={18} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="ابحث عن صنف لإضافته" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground }]} returnKeyType="search" /></View>
                  <FlatList data={products.filter((p) => p.name.includes(search.trim()))} keyExtractor={(p) => String(p.id)} style={{ maxHeight: 230 }} keyboardShouldPersistTaps="handled" renderItem={({ item }) => <ProductRow p={item} colors={colors} onPress={() => addLine(item)} />} />
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>تفاصيل الفاتورة</Text>
                  {invoiceLines.map((x) => <View key={x.productId} style={[styles.invoiceLine, { borderBottomColor: colors.border }]}><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{x.name}</Text><Text style={[styles.rowSub, { color: colors.muted }]}>{x.quantity} × {money(x.price)}</Text></View><Text style={[styles.lineTotal, { color: colors.primary }]}>{money(x.quantity * x.price)}</Text></View>)}
                  <View style={styles.total}><Text style={[styles.totalLabel, { color: colors.muted }]}>الإجمالي</Text><Text style={[styles.totalValue, { color: colors.primary }]}>{money(draftTotal)}</Text></View>
                </ScrollView>
                <Pressable disabled={createSale.isPending} onPress={saveInvoice} style={[styles.primaryButton, { backgroundColor: colors.primary }, createSale.isPending && { opacity: .6 }]}><Text style={styles.buttonText}>{createSale.isPending ? "جاري الحفظ..." : "حفظ الفاتورة وتحديث المخزون"}</Text></Pressable>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <Modal visible={showCustomer} animationType="slide" transparent onRequestClose={() => setShowCustomer(false)} statusBarTranslucent>
          <View style={styles.backdrop}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalKeyboard}>
              <View style={[styles.modal, { backgroundColor: colors.background }]}>
                <ModalHeader title="إضافة عميل" colors={colors} close={() => { Keyboard.dismiss(); setShowCustomer(false); }} />
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                  <Field label="اسم العميل" value={customerName} onChangeText={setCustomerName} colors={colors} placeholder="مثال: أحمد محمد" autoFocus={false} returnKeyType="next" />
                  <Field label="رقم الهاتف" value={customerPhone} onChangeText={setCustomerPhone} colors={colors} placeholder="رقم الجوال" keyboardType="phone-pad" returnKeyType="done" />
                </ScrollView>
                <Pressable disabled={createCustomer.isPending} onPress={() => { Keyboard.dismiss(); saveCustomer(); }} style={[styles.primaryButton, { backgroundColor: colors.primary }, createCustomer.isPending && { opacity: .6 }]}><Text style={styles.buttonText}>{createCustomer.isPending ? "جاري الحفظ..." : "موافق وحفظ العميل"}</Text></Pressable>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <Modal visible={showProduct} animationType="slide" transparent onRequestClose={() => setShowProduct(false)} statusBarTranslucent>
          <View style={styles.backdrop}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalKeyboard}>
              <View style={[styles.modal, { backgroundColor: colors.background }]}>
                <ModalHeader title="إضافة صنف جديد" colors={colors} close={() => { Keyboard.dismiss(); setShowProduct(false); }} />
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                  <Field label="اسم الصنف" value={productName} onChangeText={setProductName} colors={colors} placeholder="مثال: كرتون مياه" returnKeyType="next" />
                  <View style={styles.two}><Field label="سعر الشراء" value={productPurchase} onChangeText={setProductPurchase} colors={colors} placeholder="0" keyboardType="decimal-pad" returnKeyType="next" /><Field label="سعر البيع" value={productSale} onChangeText={setProductSale} colors={colors} placeholder="0" keyboardType="decimal-pad" returnKeyType="next" /></View>
                  <View style={styles.two}><Field label="الرصيد الافتتاحي" value={productStock} onChangeText={setProductStock} colors={colors} placeholder="0" keyboardType="decimal-pad" returnKeyType="next" /><Field label="الحد الأدنى" value={productMin} onChangeText={setProductMin} colors={colors} placeholder="0" keyboardType="decimal-pad" returnKeyType="done" /></View>
                </ScrollView>
                <Pressable disabled={createProduct.isPending} onPress={() => { Keyboard.dismiss(); saveProduct(); }} style={[styles.primaryButton, { backgroundColor: colors.primary }, createProduct.isPending && { opacity: .6 }]}><Text style={styles.buttonText}>{createProduct.isPending ? "جاري الحفظ..." : "موافق وحفظ الصنف"}</Text></Pressable>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function Home({ colors, report, lowStock, onInvoice, onCustomer, onProduct, onSection }: any) {
  const r = report ?? { sales: 0, invoices: 0, expenses: 0, netProfit: 0, lowStock: 0 };
  return <>
    <View style={[styles.hero, { backgroundColor: colors.primary }]}><View style={{ flex: 1 }}><Text style={styles.heroSmall}>مبيعات اليوم</Text><Text style={styles.heroValue}>{money(r.sales)}</Text><Text style={styles.heroHint}>صافي الربح: {money(r.netProfit)}</Text></View><View style={styles.heroIcon}><IconSymbol name="chart.bar.fill" size={30} color="#D7F7E9" /></View></View>
    <View style={styles.grid}><Stat label="فواتير اليوم" value={String(r.invoices)} icon="doc.text.fill" colors={colors} /><Stat label="المصروفات" value={money(r.expenses)} icon="arrow.down.circle.fill" colors={colors} /><Stat label="صافي الربح" value={money(r.netProfit)} icon="chart.bar.fill" colors={colors} /></View>
    <Pressable onPress={onInvoice} style={[styles.primaryButton, { backgroundColor: colors.foreground }]}><IconSymbol name="plus" size={20} color="#fff" /><Text style={styles.buttonText}>إنشاء فاتورة جديدة</Text></Pressable>
    <View style={styles.sectionHead}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>اختصارات سريعة</Text></View>
    <View style={styles.quickGrid}><Quick icon="person.badge.plus" text="عميل جديد" color="#2878C8" onPress={onCustomer} /><Quick icon="shippingbox.fill" text="إضافة صنف" color={colors.primary} onPress={onProduct} /><Quick icon="chart.bar.fill" text="التقارير" color="#8B5CF6" onPress={() => onSection("reports")} /><Quick icon="arrow.down.circle.fill" text="مصروف" color={colors.warning} onPress={() => onSection("expenses")} /></View>
    <View style={styles.sectionHead}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>تنبيهات المخزون</Text><Text style={[styles.sectionAction, { color: colors.primary }]}>{lowStock.length} صنف منخفض</Text></View>
    {lowStock.slice(0, 4).map((p: any) => <View key={p.id} style={[styles.cardRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.dot, { backgroundColor: colors.warning }]}><IconSymbol name="exclamationmark.triangle.fill" size={15} color="#fff" /></View><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{p.name}</Text><Text style={[styles.rowSub, { color: colors.muted }]}>المتوفر {p.stock} · الحد الأدنى {p.minStock}</Text></View><Text style={[styles.warning, { color: colors.warning }]}>منخفض</Text></View>)}
  </>;
}
function Invoices({ colors, invoices, onNew }: any) { return <><Pressable onPress={onNew} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><IconSymbol name="plus" size={19} color="#fff" /><Text style={styles.buttonText}>فاتورة جديدة</Text></Pressable><View style={styles.sectionHead}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>آخر الفواتير</Text></View>{invoices.map((x: any) => <View key={x.id} style={[styles.cardRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.invoiceBadge, { backgroundColor: colors.primary + "18" }]}><IconSymbol name="doc.text.fill" size={17} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{x.invoiceNo}</Text><Text style={[styles.rowSub, { color: colors.muted }]}>{new Date(x.createdAt).toLocaleString("ar-SA")} · {x.paymentType === "cash" ? "نقدي" : "آجل"}</Text></View><Text style={[styles.price, { color: colors.primary }]}>{money(x.total)}</Text></View>)}</>; }
function Stock({ colors, products, lowStock, search, setSearch, onAdd, onInvoice }: any) { return <><View style={styles.actions}><Pressable onPress={onAdd} style={[styles.primarySmall, { backgroundColor: colors.primary }]}><IconSymbol name="plus" size={18} color="#fff" /><Text style={styles.buttonText}>إضافة صنف</Text></Pressable><Text style={[styles.counter, { color: colors.muted }]}>{products.length} صنف</Text></View><View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="magnifyingglass" size={18} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="ابحث بالاسم أو الباركود" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground }]} /></View><View style={styles.sectionHead}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>المخزون</Text><Text style={[styles.sectionAction, { color: colors.warning }]}>{lowStock.length} منخفض</Text></View>{products.map((p: any) => <ProductRow key={p.id} p={p} colors={colors} onPress={() => onInvoice(p)} />)}</>; }
function Customers({ colors, customers, search, setSearch, onAdd }: any) { return <><Pressable onPress={onAdd} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><IconSymbol name="person.badge.plus" size={19} color="#fff" /><Text style={styles.buttonText}>إضافة عميل</Text></Pressable><View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="magnifyingglass" size={18} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="ابحث عن العميل أو الهاتف" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground }]} /></View>{customers.map((c: any) => <View key={c.id} style={[styles.cardRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.avatar, { backgroundColor: colors.primary + "18" }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{c.name.slice(0, 1)}</Text></View><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{c.name}</Text><Text style={[styles.rowSub, { color: colors.muted }]}>{c.phone || "بدون هاتف"}</Text></View><Text style={[styles.price, { color: colors.warning }]}>{money(c.balance)}</Text></View>)}</>; }
function Reports({ colors, report }: any) { const r = report ?? { sales: 0, purchases: 0, expenses: 0, costOfGoods: 0, grossProfit: 0, netProfit: 0, invoices: 0, lowStock: 0 }; return <><View style={[styles.reportHero, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.reportCaption, { color: colors.muted }]}>تقرير اليوم</Text><Text style={[styles.reportMain, { color: colors.foreground }]}>{money(r.sales)}</Text><Text style={[styles.rowSub, { color: colors.muted }]}>{r.invoices} فاتورة مبيعات</Text></View><ReportRow label="تكلفة البضاعة المباعة" value={r.costOfGoods} colors={colors} /><ReportRow label="مجمل الربح" value={r.grossProfit} colors={colors} /><ReportRow label="المصروفات" value={r.expenses} colors={colors} /><ReportRow label="صافي الربح" value={r.netProfit} colors={colors} /><ReportRow label="المشتريات" value={r.purchases} colors={colors} /><ReportRow label="أصناف منخفضة" value={r.lowStock} colors={colors} suffix=" صنف" /></>; }
function Expenses({ colors, expenses, category, amount, setCategory, setAmount, onSave }: any) { return <><View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>تسجيل مصروف</Text><Field label="نوع المصروف" value={category} onChangeText={setCategory} colors={colors} placeholder="كهرباء، نقل، إيجار..." /><Field label="المبلغ" value={amount} onChangeText={setAmount} colors={colors} placeholder="0.00" keyboardType="decimal-pad" /><Pressable onPress={() => { Keyboard.dismiss(); onSave(); }} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={styles.buttonText}>حفظ المصروف</Text></Pressable></View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>آخر المصروفات</Text>{expenses.map((x: any) => <View key={x.id} style={[styles.cardRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{x.category}</Text><Text style={[styles.rowSub, { color: colors.muted }]}>{new Date(x.createdAt).toLocaleDateString("ar-SA")}</Text></View><Text style={[styles.price, { color: colors.warning }]}>{money(x.amount)}</Text></View>)}</>; }
function Settings({ colors }: any) { return <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>إعدادات المتجر</Text><Text style={[styles.rowSub, { color: colors.muted }]}>اسم المتجر، رقم الهاتف، عنوان المتجر، العملة ومقاس الإيصال ستُدار من قاعدة البيانات. تم تجهيز واجهة الإعدادات والـ API لذلك.</Text><View style={[styles.settingLine, { borderBottomColor: colors.border }]}><Text style={[styles.rowTitle, { color: colors.foreground }]}>مقاس الإيصال</Text><Text style={[styles.price, { color: colors.primary }]}>58mm / 80mm</Text></View><View style={styles.settingLine}><Text style={[styles.rowTitle, { color: colors.foreground }]}>نوع الطباعة</Text><Text style={[styles.rowSub, { color: colors.muted }]}>PDF + تجهيز للطابعة الحرارية</Text></View></View>; }
function ProductRow({ p, colors, onPress }: any) { const low = Number(p.stock) <= Number(p.minStock); return <Pressable onPress={onPress} style={[styles.cardRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.dot, { backgroundColor: low ? colors.warning : colors.primary }]}><IconSymbol name="shippingbox.fill" size={15} color="#fff" /></View><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{p.name}</Text><Text style={[styles.rowSub, { color: colors.muted }]}>{p.unit} · مخزون {p.stock} · شراء {money(p.purchasePrice)}</Text></View><View style={{ alignItems: "flex-end" }}><Text style={[styles.price, { color: colors.primary }]}>{money(p.salePrice)}</Text><Text style={[styles.rowSub, { color: low ? colors.warning : colors.muted }]}>{low ? "منخفض" : "متوفر"}</Text></View></Pressable>; }
function ReportRow({ label, value, colors, suffix = "" }: any) { return <View style={[styles.reportRow, { borderBottomColor: colors.border }]}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{label}</Text><Text style={[styles.price, { color: colors.primary }]}>{typeof value === "number" && suffix ? `${value}${suffix}` : money(value)}</Text></View>; }
function Stat({ label, value, icon, colors }: any) { return <View style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name={icon} size={19} color={colors.primary} /><Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text><Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text></View>; }
function Quick({ icon, text, color, onPress }: any) { return <Pressable onPress={onPress} style={styles.quick}><View style={[styles.quickIcon, { backgroundColor: color + "18" }]}><IconSymbol name={icon} size={21} color={color} /></View><Text style={styles.quickText}>{text}</Text></Pressable>; }
function Tab({ icon, label, active, colors, onPress }: any) { return <Pressable onPress={onPress} style={styles.tab}><IconSymbol name={icon} size={21} color={active ? colors.primary : colors.muted} /><Text style={[styles.tabText, { color: active ? colors.primary : colors.muted }]}>{label}</Text></Pressable>; }
function Pill({ label, active, colors, onPress }: any) { return <Pressable onPress={onPress} style={[styles.pill, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + "12" : colors.surface }]}><Text style={{ color: active ? colors.primary : colors.muted, fontWeight: "700" }}>{label}</Text></Pressable>; }
function Field({ label, value, onChangeText, colors, placeholder, keyboardType, autoFocus = false, returnKeyType = "next" }: any) { return <View style={{ flex: 1, marginBottom: 12 }}><Text style={[styles.label, { color: colors.muted }]}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} keyboardType={keyboardType} autoFocus={autoFocus} returnKeyType={returnKeyType} blurOnSubmit={returnKeyType === "done"} style={[styles.formInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground }]} /></View>; }
function ModalHeader({ title, colors, close }: any) { return <View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: colors.foreground }]}>{title}</Text><Pressable onPress={close} style={styles.close} hitSlop={8}><IconSymbol name="xmark" size={20} color={colors.muted} /></Pressable></View>; }

const styles = StyleSheet.create({ page: { flex: 1 }, scroll: { paddingBottom: 20 }, header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }, brand: { fontSize: 14, fontWeight: "800" }, title: { fontSize: 25, fontWeight: "900", marginTop: 2 }, logo: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" }, hero: { borderRadius: 24, padding: 20, flexDirection: "row-reverse", alignItems: "center", marginBottom: 14, shadowOpacity: .12, shadowRadius: 14, elevation: 3 }, heroSmall: { color: "#D7F7E9", fontSize: 13, fontWeight: "700", textAlign: "right" }, heroValue: { color: "#fff", fontSize: 30, fontWeight: "900", marginTop: 4, textAlign: "right" }, heroHint: { color: "#E7FFF3", marginTop: 6, fontWeight: "600", textAlign: "right" }, heroIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: "#ffffff18", alignItems: "center", justifyContent: "center", marginLeft: 14 }, grid: { flexDirection: "row", gap: 9, marginBottom: 14 }, stat: { flex: 1, borderWidth: 1, borderRadius: 18, padding: 13, minHeight: 90 }, statLabel: { fontSize: 11, marginTop: 8 }, statValue: { fontSize: 16, fontWeight: "900", marginTop: 4 }, primaryButton: { minHeight: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginBottom: 16, paddingHorizontal: 12 }, primarySmall: { minHeight: 44, borderRadius: 14, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }, buttonText: { color: "#fff", fontWeight: "900", fontSize: 15, textAlign: "center" }, sectionHead: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginTop: 9, marginBottom: 10 }, sectionTitle: { fontSize: 17, fontWeight: "900" }, sectionAction: { fontSize: 12, fontWeight: "800" }, quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 }, quick: { width: "47.5%", backgroundColor: "#ffffff", borderRadius: 18, padding: 13, flexDirection: "row-reverse", alignItems: "center", gap: 10, elevation: 1 }, quickIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, quickText: { fontWeight: "800", color: "#17221D" }, cardRow: { borderWidth: 1, borderRadius: 17, padding: 13, marginBottom: 9, flexDirection: "row-reverse", alignItems: "center", gap: 10 }, dot: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" }, invoiceBadge: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" }, avatar: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, avatarText: { fontSize: 18, fontWeight: "900" }, rowTitle: { fontSize: 14, fontWeight: "800", textAlign: "right" }, rowSub: { fontSize: 11, marginTop: 4, textAlign: "right" }, price: { fontSize: 13, fontWeight: "900" }, warning: { fontSize: 11, fontWeight: "900" }, actions: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }, counter: { fontWeight: "800" }, searchBox: { height: 50, borderRadius: 15, borderWidth: 1, flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 13, gap: 8, marginBottom: 12 }, input: { flex: 1, fontSize: 14, textAlign: "right", minWidth: 0 }, reportHero: { borderWidth: 1, borderRadius: 22, padding: 20, marginBottom: 12 }, reportCaption: { fontWeight: "700" }, reportMain: { fontSize: 30, fontWeight: "900", marginTop: 5 }, reportRow: { minHeight: 54, borderBottomWidth: 1, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }, formCard: { borderWidth: 1, borderRadius: 20, padding: 15, marginBottom: 16 }, label: { fontSize: 11, fontWeight: "800", textAlign: "right", marginBottom: 6 }, formInput: { borderWidth: 1, borderRadius: 13, minHeight: 50, paddingHorizontal: 12, textAlign: "right", fontSize: 15 }, two: { flexDirection: "row-reverse", gap: 9 }, modalKeyboard: { flex: 1, justifyContent: "flex-end" }, keyboardLayer: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }, modal: { width: "100%", maxHeight: "92%", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, overflow: "hidden" }, modalScroll: { paddingBottom: 10 }, backdrop: { flex: 1, backgroundColor: "#00000066", justifyContent: "flex-end" }, modalHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }, modalTitle: { fontSize: 19, fontWeight: "900" }, close: { width: 38, height: 38, borderRadius: 13, backgroundColor: "#00000008", alignItems: "center", justifyContent: "center" }, pill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8 }, invoiceLine: { flexDirection: "row-reverse", alignItems: "center", paddingVertical: 9, borderBottomWidth: 1 }, lineTotal: { fontWeight: "900", fontSize: 14 }, total: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 }, totalLabel: { fontSize: 13, fontWeight: "800" }, totalValue: { fontSize: 22, fontWeight: "900" }, tabBar: { position: "absolute", bottom: 4, left: 0, right: 0, borderWidth: 1, borderRadius: 22, height: 66, flexDirection: "row", alignItems: "center", justifyContent: "space-around", elevation: 8 }, tab: { alignItems: "center", justifyContent: "center", minWidth: 55, gap: 3 }, tabText: { fontSize: 9, fontWeight: "800" }, settingLine: { minHeight: 55, borderBottomWidth: 1, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }
});
