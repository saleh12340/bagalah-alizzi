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
import { trpc } from "@/lib/trpc";
import { printReceipt, shareInvoicePdf } from "@/lib/invoice-sharing";

import { Card } from "@/components/ui/Card";
import { Stat as StatCard } from "@/components/ui/Stat";
import { ActionRow } from "@/components/ui/ActionRow";
import { FAB } from "@/components/ui/FAB";
import { Field } from "@/components/ui/Field";

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
  const report = reportQ.data || {};
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

  function openNewInvoiceMode(mode: "stock" | "free") {
    setSection("invoice");
    // navigate into invoice flow; existing invoice modal logic lives inside invoice view
    // We'll rely on the invoice component to show a creation UI when section===invoice
    // For now just alert to confirm.
    Alert.alert("إنشاء فاتورة", `فتح واجهة إنشاء الفاتورة (${mode})`);
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
                  <StatCard label="عدد الفواتير" value={report.invoicesCount || 0} />
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
            />
          )}

          {section === "stock" && (
            <StockView products={products} onBack={() => setSection("home")} colors={colors} />
          )}

          {section === "customers" && <CustomersView customers={customers} onBack={() => setSection("home")} colors={colors} />}

          {section === "reports" && <ReportsView report={report} onBack={() => setSection("home")} colors={colors} />}

          {section === "settings" && <SettingsView colors={colors} onBack={() => setSection("home")} />}
        </ScrollView>

        <FAB onPress={() => openNewInvoiceMode("stock")} />
      </View>
    </ScreenContainer>
  );
}

function InvoiceView({ onBack, products, customers, colors }: any) {
  const [lines, setLines] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [notes, setNotes] = useState("");

  const total = useMemo(() => lines.reduce((s, x) => s + Number(x.unitPrice || 0) * Number(x.quantity || 0), 0), [lines]);

  function addLine() {
    setLines((old) => [...old, { description: "", quantity: 1, unitPrice: 0 }]);
  }

  async function saveInvoice() {
    if (!lines.length) return Alert.alert("تنبيه", "أضف بنداً واحداً على الأقل.");
    try {
      const payload = lines.map((l) => ({ name: l.description || "-", quantity: Number(l.quantity) || 0, unitPrice: Number(l.unitPrice) || 0 }));
      const uri = await shareInvoicePdf(payload, undefined, undefined, "80mm");
      if (uri) {
        Alert.alert("تم", "تم توليد ومشاركة الفاتورة.");
      } else {
        // Fallback to direct print
        await printReceipt(payload, undefined, "80mm");
        Alert.alert("تم", "تم الطباعة.");
      }
    } catch (e) {
      console.warn(e);
      Alert.alert("خطأ", "تعذر توليد الفاتورة أو مشاركتها.");
    }
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
        <Field label="ملاحظات" value={notes} onChangeText={setNotes} placeholder="ملاحظات داخل الفاتورة" />

        {lines.map((l, idx) => (
          <View key={idx} style={{ marginBottom: 8 }}>
            <TextInput
              value={l.description}
              onChangeText={(t) => setLines((s) => s.map((x, i) => (i === idx ? { ...x, description: t } : x)))}
              placeholder="وصف البند"
              style={{ borderWidth: 1, borderColor: colors.border, padding: 8, borderRadius: 8, marginBottom: 6, backgroundColor: colors.surface }}
            />
            <View style={{ flexDirection: "row-reverse", gap: 8 }}>
              <TextInput
                value={String(l.quantity)}
                onChangeText={(t) => setLines((s) => s.map((x, i) => (i === idx ? { ...x, quantity: Number(t) || 0 } : x)))}
                keyboardType="number-pad"
                style={{ flex: 1, borderWidth: 1, borderColor: colors.border, padding: 8, borderRadius: 8, backgroundColor: colors.surface }}
              />
              <TextInput
                value={String(l.unitPrice)}
                onChangeText={(t) => setLines((s) => s.map((x, i) => (i === idx ? { ...x, unitPrice: Number(t) || 0 } : x)))}
                keyboardType="decimal-pad"
                style={{ flex: 1, borderWidth: 1, borderColor: colors.border, padding: 8, borderRadius: 8, backgroundColor: colors.surface }}
              />
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
          <Pressable onPress={saveInvoice} style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center" }}>
            <Text style={{ color: "#fff", fontWeight: "800" }}>طباعة/مشاركة</Text>
          </Pressable>
          <Pressable onPress={() => Alert.alert("حفظ مؤقت", "تم حفظ الفاتورة محليًا (محاكاة)")} style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}>
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>حفظ</Text>
          </Pressable>
        </View>
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

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { paddingBottom: 20 },
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 15 },
  brand: { fontSize: 13, fontWeight: "800" },
  title: { fontSize: 18, fontWeight: "700" },
});
