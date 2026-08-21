import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert, Linking, Platform } from "react-native";

export type InvoicePdfLine = {
  name: string;
  quantity: number;
  unitPrice: number;
};

const escapeHtml = (value: string) => value.replace(/[&<>\"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;",
}[character] ?? character));

const formatMoney = (value: number) => `${value.toFixed(2)} ر.س`;

export function buildInvoiceHtml(lines: InvoicePdfLine[], customerName?: string) {
  const total = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const rows = lines.map((line) => `
    <tr><td>${escapeHtml(line.name)}</td><td>${line.quantity}</td><td>${formatMoney(line.unitPrice)}</td><td>${formatMoney(line.quantity * line.unitPrice)}</td></tr>
  `).join("");
  return `<!doctype html><html dir="rtl"><head><meta charset="utf-8"/><style>
    @page { margin: 22px; } body { font-family: Arial, sans-serif; color: #17221D; direction: rtl; }
    .brand { text-align: center; color: #087F5B; font-size: 24px; font-weight: bold; margin-bottom: 4px; }
    .subtitle { text-align: center; color: #718078; margin-bottom: 20px; } .meta { display:flex; justify-content:space-between; background:#F3F7F4; padding:12px; border-radius:8px; margin-bottom:16px; }
    table { width:100%; border-collapse:collapse; margin-top:12px; } th { background:#087F5B; color:#fff; padding:9px; } td { border-bottom:1px solid #E4EAE6; padding:9px; text-align:center; } td:first-child, th:first-child { text-align:right; }
    .total { text-align:left; font-size:20px; font-weight:bold; color:#087F5B; margin-top:20px; } .footer { text-align:center; color:#718078; margin-top:28px; font-size:12px; }
  </style></head><body><div class="brand">بقالة العزي للمواد الغذائية</div><div class="subtitle">فاتورة مبيعات</div>
  <div class="meta"><span>رقم الفاتورة: ${Date.now().toString().slice(-6)}</span><span>التاريخ: ${new Date().toLocaleDateString("ar-SA")}</span></div>
  ${customerName ? `<p><strong>العميل:</strong> ${escapeHtml(customerName)}</p>` : "<p><strong>العميل:</strong> نقدي</p>"}
  <table><thead><tr><th>الصنف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="total">الإجمالي: ${formatMoney(total)}</div><div class="footer">شكرًا لتعاملكم مع بقالة العزي</div></body></html>`;
}

export async function createInvoicePdf(lines: InvoicePdfLine[], customerName?: string) {
  if (Platform.OS === "web") {
    Alert.alert("غير متاح على الويب", "تصدير PDF ومشاركة الملفات متاحان في تطبيق Android.");
    return null;
  }
  const result = await Print.printToFileAsync({ html: buildInvoiceHtml(lines, customerName), width: 595, height: 842 });
  return result.uri;
}

export async function shareInvoicePdf(lines: InvoicePdfLine[], customerName?: string, phone?: string) {
  try {
    const uri = await createInvoicePdf(lines, customerName);
    if (!uri) return;
    const available = await Sharing.isAvailableAsync();
    if (!available) throw new Error("sharing_unavailable");
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: phone ? `إرسال الفاتورة إلى ${phone} عبر واتساب` : "مشاركة الفاتورة PDF",
    });
    if (phone && Platform.OS === "android") {
      const normalizedPhone = phone.replace(/[^0-9+]/g, "");
      const whatsappUrl = `whatsapp://send?phone=${encodeURIComponent(normalizedPhone)}&text=${encodeURIComponent("السلام عليكم، مرفق فاتورتكم من بقالة العزي.")}`;
      if (await Linking.canOpenURL(whatsappUrl)) await Linking.openURL(whatsappUrl);
    }
    return uri;
  } catch {
    Alert.alert("تعذر مشاركة الفاتورة", "تأكد من تثبيت واتساب أو جرّب المشاركة من تطبيق آخر.");
    return null;
  }
}
