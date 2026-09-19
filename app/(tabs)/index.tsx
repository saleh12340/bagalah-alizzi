import React, { useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { shareInvoicePdf, printReceipt } from "@/lib/invoice-sharing";
import { loadLocalState, saveLocalState, type LocalCustomer, type LocalExpense, type LocalInvoice, type LocalProduct, type LocalState } from "@/lib/local-store";

import { Card } from "@/components/ui/Card";
import { Stat as StatCard } from "@/components/ui/Stat";
import { ActionRow } from "@/components/ui/ActionRow";
import { FAB } from "@/components/ui/FAB";
import { Field } from "@/components/ui/Field";
import { trpc } from "@/lib/trpc";

type Section = "home" | "invoice" | "stock" | "customers" | "reports" | "expenses" | "settings";

const money = (v: any, c = "ر.س") => `${Number(v || 0).toFixed(2)} ${c}`;
const todayRange = () => {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from, to };
};

export default function HomeScreen() {
  const colors = useColors();
  const [section, setSection] = useState<Section>("home");
  const [search, setSearch] = useState("");

  const productsQ = trpc.products.list.useQuery({ search: search || undefined });
  const customersQ = trpc.customers.list.useQuery({ search: search || undefined });
  const salesQ = trpc.sales.recent.useQuery({ limit: 60 });
  const reportQ = trpc.reports.summary.useQuery(todayRange());
  const activitiesQ = trpc.activity.useQuery({ limit: 50 });
  const settingsQ = trpc.settings.get.useQuery();

  const products = productsQ.data || [];
  const customers = customersQ.data || [];
  const sales = salesQ.data || [];
  const report: any = reportQ.data || {};
  const activities = activitiesQ.data || [];

  const lowStock = products.filter((p: any) => Number(p.stock) <= Number(p.minStock));

  const title =
    section === "home"
      ? "الرئيسية"
      : section === "invoice"
      ? "الفواتير"
      : section === "stock"
      ? "الأصناف والمخزون"
      : section === "customers"
      ? "الحسابات"
      : section === "reports"
      ? "التقارير"
      : section === "expenses"
      ? "المصروفات"
      : "الإعدادات";

  function openNewInvoiceMode(_mode: "stock" | "free") {
    setSection("invoice");
  }

  return (
    <ScreenContainer className="px-4 pt-3" safeAreaClassName="bg-background">
      <View style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.brand, { color: colors.primary }]}>بقالة العزي</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          </View>
          <Pressable
            onPress={() => setSection("settings")}
            style={({ pressed }) => [{ padding: 8, borderRadius: 8, backgroundColor: colors.surface }, pressed && { opacity: 0.7 }]}
          >
            <IconSymbol name="gearshape.fill" size={18} color={colors.primary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {section === "home" && (
            <View>
              <Card style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
                  <View>
                    <Text style={{ color: colors.muted, fontSize: 13 }}>نظرة سريعة</Text>
                    <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>عرض موجز للنشاط اليومي</Text>
                  </View>
                  <ActionRow
                    actions={[
                      { icon: "receipt", label: "فواتير", onPress: () => setSection("invoice") },
                      { icon: "cube.box.fill", label: "المخزون", onPress: () => setSection("stock") },
                      { icon: "person.3.fill", label: "الحسابات", onPress: () => setSection("customers") },
                      { icon: "chart.bar.fill", label: "التقارير", onPress: () => setSection("reports") },
                    ]}
                  />
                </View>

                <View style={{ marginTop: 12, flexDirection: "row-reverse", justifyContent: "space-between", gap: 10 }}>
                  <StatCard label="إجمالي المبيعات" value={money(report.totalSales || 0)} accent />
                  <StatCard label="عدد الفواتير" value={report.invoices || 0} />
                  <StatCard label="المخزون المنخفض" value={lowStock.length} />
                </View>
              </Card>

              <Card style={{ marginBottom: 12 }}>
                <Text style={{ color: colors.foreground, fontWeight: "700", marginBottom: 8 }}>الأنشطة الأخيرة</Text>
                {activities.slice(0, 6).map((a: any) => (
                  <View key={a.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={{ color: colors.foreground }}>{a.summary}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{new Date(a.createdAt).toLocaleString("ar-SA")}</Text>
                  </View>
                ))}
              </Card>

              <Card>
                <Text style={{ color: colors.foreground, fontWeight: "700", marginBottom: 8 }}>اختصارات سريعة</Text>
                <View style={{ marginTop: 8 }}>
                  <ActionRow
                    actions={[
                      { icon: "plus", label: "فاتورة من المخزن", color: colors.primary, onPress: () => openNewInvoiceMode("stock") },
                      { icon: "doc.on.doc.fill", label: "فاتورة حرة", color: "#2878C8", onPress: () => openNewInvoiceMode("free") },
                      { icon: "person.badge.plus", label: "عميل جديد", color: "#8B5CF6", onPress: () => setSection("customers") },
                    ]}
                  />
                </View>
              </Card>

              <View style={{ height: 90 }} />
            </View>
          )}

          {section === "invoice" && (
            <InvoiceView
              onBack={() => setSection("home")}
              products={products}
              customers={customers}
              colors={colors}
              storeName={settingsQ.data?.storeName}
            />
          )}

          {section === "stock" && (
            <StockView products={products} onBack={() => setSection("home")} colors={colors} />
          )}

          {section === "customers" && <CustomersView customers={customers} onBack={() => setSection("home")} colors={colors} />}

          {section === "reports" && <ReportsView report={report} onBack={() => setSection("home")} colors={colors} />}

          {section === "settings" && <SettingsView colors={colors} onBack={() => setSection("home")} />}
        </ScrollView>

        <View style={[styles.bottomNav, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {([
            ["home", "الرئيسية", "house.fill"],
            ["invoice", "الفواتير", "receipt"],
            ["stock", "المخزون", "cube.box.fill"],
            ["customers", "الحسابات", "person.3.fill"],
            ["reports", "التقارير", "chart.bar.fill"],
            ["expenses", "المصروفات", "creditcard.fill"],
          ] as const).map(([key, label, icon]) => (
            <Pressable key={key} onPress={() => setSection(key as Section)} style={styles.navItem}>
              <IconSymbol name={icon} size={19} color={section === key ? colors.primary : colors.muted} />
              <Text style={[styles.navLabel, { color: section === key ? colors.primary : colors.muted }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <FAB onPress={() => openNewInvoiceMode("stock")} />
      </View>
    </ScreenContainer>
  );
}

function InvoiceView({ onBack, products, customers, colors, storeName }: any) {
  const utils = trpc.useUtils();
  const [lines, setLines] = useState<any[]>([{ description: "", quantity: 1, total: 0, unitPrice: 0 }]);
  const [customer, setCustomer] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [editId, setEditId] = useState<number | null>(null);

  const total = useMemo(() => lines.reduce((s, x) => s + Number(x.total || 0), 0), [lines]);
  const recentQ = trpc.freeInvoices.recent.useQuery({ limit: 20 });

  function updateLine(index: number, patch: any) {
    setLines((items) => items.map((x, i) => {
      if (i !== index) return x;
      const next = { ...x, ...patch };
      const q = Number(next.quantity) || 0;
      const t = Number(next.total) || 0;
      next.unitPrice = q > 0 ? t / q : 0;
      return next;
    }));
  }

  const createSale = trpc.freeInvoices.create.useMutation({
    onSuccess: async (d) => {
      // after saving, we could refresh queries if needed. keeping simple for now.
      console.log('sale saved', d);
    },
    onError: (err) => {
      console.warn('sale save failed', err);
    }
  });

  const updateSale = trpc.freeInvoices.update.useMutation({
    onSuccess: async (d) => {
      console.log('sale updated', d);
    },
    onError: (err) => console.warn('sale update failed', err),
  });

  const deleteSale = trpc.freeInvoices.delete.useMutation({
    onSuccess: async () => {
      console.log('sale deleted');
    },
    onError: (err) => console.warn('sale delete failed', err),
  });

  function addLine() {
    setLines((old) => [...old, { description: "", quantity: 1, unitPrice: 0 }]);
  }

  function buildPayload() {
    return lines.map((l) => ({
      name: l.description || "-",
      quantity: Number(l.quantity) || 0,
      unitPrice: Number(l.unitPrice) || 0,
    }));
  }

  async function persistInvoice() {
    const payload = buildPayload();
    if (!payload.length) {
      Alert.alert("تنبيه", "أضف بنداً واحداً على الأقل.");
      return null;
    }

    if (editId) {
      await updateSale.mutateAsync({
        id: editId,
        items: payload.map((x) => ({ description: x.name, quantity: x.quantity, unitPrice: x.unitPrice })),
        notes: notes || undefined,
      });
    } else {
      await createSale.mutateAsync({
        items: payload.map((x) => ({ description: x.name, quantity: x.quantity, unitPrice: x.unitPrice })),
        notes: notes || undefined,
      });
    }
    await utils.freeInvoices.recent.invalidate();
    return payload;
  }

  async function saveInvoice() {
    const payload = await persistInvoice();
    if (!payload) return;
    Alert.alert("تم الحفظ", "تم حفظ الفاتورة بنجاح.");
  }

  async function printOrShareInvoice() {
    const payload = await persistInvoice();
    if (!payload) return;
    try {
      // Persist invoice to backend first
      if (editId) {
        await updateSale.mutateAsync({ id: editId, items: payload.map((x) => ({ description: x.name, quantity: x.quantity, unitPrice: x.unitPrice })), notes: notes || undefined });
      } else {
        await createSale.mutateAsync({ items: payload.map((x) => ({ description: x.name, quantity: x.quantity, unitPrice: x.unitPrice })), notes: notes || undefined });
      }

      // Then generate & share PDF
      const uri = await shareInvoicePdf(payload, undefined, undefined, "80mm", { storeName });
      if (uri) {
        Alert.alert("تم", "تم توليد ومشاركة الفاتورة.");
        return;
      }

      // Fallback: direct print
      await printReceipt(payload, undefined, "80mm");
      Alert.alert("تم", "تم الطباعة.");
    } catch (e) {
      console.warn(e);
      // Fallback attempt to still create PDF/print even if backend failed
      try {
        const uri = await shareInvoicePdf(payload, undefined, undefined, "80mm", { storeName });
        if (uri) {
          Alert.alert("تم", "تم توليد ومشاركة الفاتورة (بدون حفظ على الخادم).");
          return;
        }
        await printReceipt(payload, undefined, "80mm");
        Alert.alert("تم", "تم الطباعة (بدون حفظ على الخادم).");
      } catch (err) {
        console.warn(err);
        Alert.alert("خطأ", "تعذر توليد الفاتورة أو مشاركتها.");
      }
    }
  }

  async function removeInvoice() {
    if (!editId) return;
    Alert.alert("حذف الفاتورة", "هل أنت متأكد؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteSale.mutateAsync({ id: editId });
            Alert.alert("تم", "تم حذف الفاتورة.");
            onBack();
          } catch (err) {
            console.warn(err);
            Alert.alert("خطأ", "تعذر حذف الفاتورة.");
          }
        },
      },
    ]);
  }

  return (
    <View>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <View>
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>فاتورة جديدة</Text>
          <Text style={{ color: colors.muted }}>أنشئ فاتورة وشارِك أو اطبعها فوراً</Text>
        </View>
        <Pressable onPress={onBack} style={{ padding: 8 }}>
          <IconSymbol name="xmark" size={20} color={colors.muted} />
        </Pressable>
      </View>

      <Card>
        <Field label="اسم العميل (اختياري)" value={customer?.name || ""} onChangeText={(text) => setCustomer({ name: text })} placeholder="اكتب اسم العميل" />
        <Field label="ملاحظات" value={notes} onChangeText={setNotes} placeholder="ملاحظات داخل الفاتورة" />

        {lines.map((l, idx) => (
          <View key={idx} style={[styles.invoiceLine, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={styles.invoiceHeaderRow}>
              <Text style={[styles.lineHeader, { color: colors.muted }]}>الإجمالي</Text>
              <Text style={[styles.lineHeader, { color: colors.muted }]}>الكمية</Text>
              <Text style={[styles.lineHeader, { color: colors.muted, flex: 1.5 }]}>اسم الصنف</Text>
              <Text style={[styles.lineHeader, { color: colors.muted }]}>سعر الوحدة</Text>
            </View>
            <View style={styles.invoiceInputRow}>
              <TextInput
                value={String(l.total || "")}
                onChangeText={(t) => updateLine(idx, { total: Number(t.replace(",", ".")) || 0 })}
                keyboardType="decimal-pad"
                placeholder="0.00"
                style={[styles.cellInput, styles.totalInput, { color: colors.foreground, borderColor: colors.border }]}
              />
              <TextInput
                value={String(l.quantity ?? "")}
                onChangeText={(t) => updateLine(idx, { quantity: Number(t.replace(",", ".")) || 0 })}
                keyboardType="decimal-pad"
                placeholder="1"
                style={[styles.cellInput, { color: colors.foreground, borderColor: colors.border }]}
              />
              <TextInput
                value={l.description}
                onChangeText={(t) => updateLine(idx, { description: t })}
                placeholder="اسم الصنف"
                style={[styles.cellInput, { flex: 1.5, color: colors.foreground, borderColor: colors.border }]}
              />
              <TextInput
                value={Number(l.unitPrice || 0).toFixed(2)}
                editable={false}
                style={[styles.cellInput, styles.unitInput, { color: colors.muted, borderColor: colors.border }]}
              />
              <Pressable onPress={() => setLines((items) => items.filter((_, i) => i !== idx))} style={styles.deleteCell}>
                <Text style={{ color: "#fff", fontWeight: "800" }}>حذف</Text>
              </Pressable>
            </View>
          </View>
        ))}


        <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <Pressable onPress={addLine} style={{ padding: 10 }}>
            <Text style={{ color: colors.primary, fontWeight: "700" }}>أضف بند</Text>
          </Pressable>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: colors.muted }}>الإجمالي</Text>
            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>{money(total)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 12, flexDirection: "row-reverse", gap: 8 }}>
          <Pressable onPress={printOrShareInvoice} style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center" }}>
            <Text style={{ color: "#fff", fontWeight: "800" }}>طباعة/مشاركة</Text>
          </Pressable>
          <Pressable onPress={saveInvoice} style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}>
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>حفظ</Text>
          </Pressable>
        </View>

        {editId ? (
          <View style={{ marginTop: 10 }}>
            <Pressable onPress={removeInvoice} style={{ padding: 12, borderRadius: 10, backgroundColor: "#ff3b30", alignItems: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "800" }}>حذف الفاتورة</Text>
            </Pressable>
          </View>
        ) : null}
      </Card>

      <View style={{ height: 90 }} />
    </View>
  );
}

function StockView({ products, onBack, colors }: any) {
  return (
    <View>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>الأصناف والمخزون</Text>
        <Pressable onPress={onBack} style={{ padding: 8 }}>
          <IconSymbol name="xmark" size={20} color={colors.muted} />
        </Pressable>
      </View>

      <Card>
        {products.slice(0, 20).map((p: any) => (
          <View key={p.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ color: colors.foreground }}>{p.name}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>الكمية: {p.stock}</Text>
          </View>
        ))}
      </Card>

      <View style={{ height: 90 }} />
    </View>
  );
}

function CustomersView({ customers, onBack, colors }: any) {
  return (
    <View>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>الحسابات</Text>
        <Pressable onPress={onBack} style={{ padding: 8 }}>
          <IconSymbol name="xmark" size={20} color={colors.muted} />
        </Pressable>
      </View>

      <Card>
        {customers.slice(0, 20).map((c: any) => (
          <View key={c.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ color: colors.foreground }}>{c.name}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{c.phone || "-"}</Text>
          </View>
        ))}
      </Card>

      <View style={{ height: 90 }} />
    </View>
  );
}

function ExpensesView({ onBack, colors }: any) {
  const utils = trpc.useUtils();
  const { data = [] } = trpc.expenses.list.useQuery();
  const create = trpc.expenses.create.useMutation({ onSuccess: () => utils.expenses.list.invalidate() });
  const remove = trpc.expenses.delete.useMutation({ onSuccess: () => utils.expenses.list.invalidate() });
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const add = async () => {
    const value = Number(amount);
    if (!category.trim() || value <= 0) return Alert.alert("تنبيه", "أدخل نوع المصروف والمبلغ.");
    try { await create.mutateAsync({ category: category.trim(), amount: value, notes: notes.trim() || undefined }); setCategory(""); setAmount(""); setNotes(""); }
    catch (e: any) { Alert.alert("خطأ", e?.message || "تعذر حفظ المصروف."); }
  };

  return <View>
    <View style={styles.subHeader}><Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>المصروفات</Text><Pressable onPress={onBack}><IconSymbol name="xmark" size={20} color={colors.muted} /></Pressable></View>
    <Card>
      <Field label="نوع المصروف" value={category} onChangeText={setCategory} placeholder="مثال: كهرباء" />
      <Field label="المبلغ" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
      <Field label="ملاحظات" value={notes} onChangeText={setNotes} placeholder="اختياري" />
      <Pressable onPress={add} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}><Text style={styles.primaryBtnText}>إضافة المصروف</Text></Pressable>
    </Card>
    <Card style={{ marginTop: 12 }}>
      {(data as any[]).map((x: any) => <View key={x.id} style={[styles.listRow, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontWeight: "700" }}>{x.category}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{x.notes || new Date(x.createdAt).toLocaleString("ar-SA")}</Text></View>
        <Text style={{ color: colors.foreground, fontWeight: "800" }}>{money(x.amount)}</Text>
        <Pressable onPress={() => Alert.alert("حذف المصروف", "هل تريد حذف هذا المصروف؟", [{ text: "إلغاء", style: "cancel" }, { text: "حذف", style: "destructive", onPress: () => remove.mutate({ id: x.id }) }])}><Text style={{ color: "#B42318", marginRight: 10 }}>حذف</Text></Pressable>
      </View>)}
    </Card>
    <View style={{ height: 90 }} />
  </View>;
}

function ReportsView({ report, onBack, colors }: any) {
  return (
    <View>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>التقارير</Text>
        <Pressable onPress={onBack} style={{ padding: 8 }}>
          <IconSymbol name="xmark" size={20} color={colors.muted} />
        </Pressable>
      </View>

      <Card>
        <Text style={{ color: colors.foreground, fontWeight: "700" }}>ملخّص اليوم</Text>
        <View style={{ marginTop: 8 }}>
          <Text style={{ color: colors.muted }}>إجمالي مبيعات: {money(report.totalSales || 0)}</Text>
          <Text style={{ color: colors.muted }}>عدد الفواتير: {(report.invoices || 0) + (report.freeInvoices || 0)}</Text>
          <Text style={{ color: colors.muted }}>المصروفات: {money(report.expenses || 0)}</Text>
          <Text style={{ color: colors.muted }}>صافي الربح: {money(report.netProfit || 0)}</Text>
          <Text style={{ color: colors.muted }}>المخزون المنخفض: {report.lowStock || 0}</Text>
        </View>
      </Card>

      <View style={{ height: 90 }} />
    </View>
  );
}

function SettingsView({ colors, onBack }: any) {
  const [storeName, setStoreName] = useState("");
  const settingsQ = trpc.settings.get.useQuery();
  const update = trpc.settings.update.useMutation({ onSuccess: () => settingsQ.refetch() });

  React.useEffect(() => {
    if (settingsQ.data) {
      setStoreName(settingsQ.data.storeName || "");
    }
  }, [settingsQ.data]);

  return (
    <View>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>الإعدادات</Text>
        <Pressable onPress={onBack} style={{ padding: 8 }}>
          <IconSymbol name="xmark" size={20} color={colors.muted} />
        </Pressable>
      </View>

      <Card>
        <Field label="اسم المتجر" value={storeName || "بقالة العزي للمواد الغذائية"} onChangeText={setStoreName} placeholder="اسم المتجر" />
        <Pressable
          onPress={() => update.mutate({ storeName: storeName.trim() || "بقالة العزي للمواد الغذائية", currency: "ريال", receiptWidth: "80mm" })}
          style={{ padding: 12, backgroundColor: colors.primary, borderRadius: 10, alignItems: "center", marginTop: 8 }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>حفظ</Text>
        </Pressable>
      </Card>

      <View style={{ height: 90 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { paddingBottom: 90 },
  bottomNav: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 68, borderTopWidth: 1, flexDirection: "row-reverse", justifyContent: "space-around", alignItems: "center", paddingHorizontal: 4, paddingBottom: 4 },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 7 },
  navLabel: { fontSize: 9, marginTop: 3, fontWeight: "700" },
  subHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  primaryBtn: { padding: 13, borderRadius: 10, alignItems: "center", marginTop: 8 },
  primaryBtnText: { color: "#fff", fontWeight: "800" },
  listRow: { flexDirection: "row-reverse", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  invoiceLine: { borderWidth: 1, borderRadius: 12, padding: 8, marginTop: 10 },
  invoiceHeaderRow: { flexDirection: "row-reverse", gap: 5, marginBottom: 5 },
  invoiceInputRow: { flexDirection: "row-reverse", gap: 5, alignItems: "center" },
  lineHeader: { flex: 1, fontSize: 10, textAlign: "center" },
  cellInput: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, textAlign: "right", fontSize: 13 },
  totalInput: { fontWeight: "900" },
  unitInput: { backgroundColor: "transparent" },
  deleteCell: { minHeight: 42, paddingHorizontal: 7, borderRadius: 8, backgroundColor: "#B42318", alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 15 },
  brand: { fontSize: 13, fontWeight: "800" },
  title: { fontSize: 18, fontWeight: "700" },
});
