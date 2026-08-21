import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert, Linking, Platform } from "react-native";

export type InvoicePdfLine = { name: string; quantity: number; unitPrice: number };
const escapeHtml = (value: string) => value.replace(/[&<>\"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[c] ?? c));
const formatMoney = (value: number) => `${value.toFixed(2)} ر.س`;

export function buildInvoiceHtml(lines: InvoicePdfLine[], customerName?: string, width: "58mm" | "80mm" = "80mm") {
  const total = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const rows = lines.map((line) => `<tr><td>${escapeHtml(line.name)}</td><td>${line.quantity}</td><td>${formatMoney(line.quantity * line.unitPrice)}</td></tr>`).join("");
  const pageWidth = width === "58mm" ? "58mm" : "80mm";
  return `<!doctype html><html dir="rtl"><head><meta charset="utf-8"/><style>
  @page{size:${pageWidth} auto;margin:0}*{box-sizing:border-box}body{width:${pageWidth};margin:0 auto;padding:8px 5px;font-family:Arial,sans-serif;color:#17221D;direction:rtl;font-size:12px}.brand{text-align:center;font-size:17px;font-weight:900;margin-bottom:2px}.subtitle{text-align:center;color:#555;margin-bottom:9px;font-weight:700}.meta{border-bottom:1px dashed #777;padding-bottom:7px;margin-bottom:7px;font-size:10px;display:flex;justify-content:space-between;gap:5px}table{width:100%;border-collapse:collapse}th{border-bottom:1px solid #222;padding:5px 2px;font-size:11px}td{padding:5px 2px;border-bottom:1px dashed #bbb;text-align:center}td:first-child,th:first-child{text-align:right}.total{display:flex;justify-content:space-between;font-size:17px;font-weight:900;margin-top:10px;border-top:1px solid #222;padding-top:8px}.footer{text-align:center;margin-top:12px;font-size:10px;color:#666}.customer{margin:6px 0;font-weight:700}
  </style></head><body><div class="brand">بقالة العزي للمواد الغذائية</div><div class="subtitle">فاتورة مبيعات</div><div class="meta"><span>رقم: ${Date.now().toString().slice(-6)}</span><span>${new Date().toLocaleDateString("ar-SA")}</span></div><div class="customer">العميل: ${customerName ? escapeHtml(customerName) : "نقدي"}</div><table><thead><tr><th>الصنف</th><th>الكمية</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table><div class="total"><span>الإجمالي</span><span>${formatMoney(total)}</span></div><div class="footer">شكرًا لتعاملكم مع بقالة العزي</div></body></html>`;
}

export async function createInvoicePdf(lines: InvoicePdfLine[], customerName?: string, width: "58mm" | "80mm" = "80mm") {
  if (Platform.OS === "web") { Alert.alert("غير متاح", "تصدير PDF متاح داخل تطبيق Android."); return null; }
  const result = await Print.printToFileAsync({ html: buildInvoiceHtml(lines, customerName, width), width: width === "58mm" ? 219 : 302, height: 1200 });
  return result.uri;
}

export async function printReceipt(lines: InvoicePdfLine[], customerName?: string, width: "58mm" | "80mm" = "80mm") {
  if (Platform.OS === "web") { Alert.alert("غير متاح", "الطباعة متاحة داخل تطبيق Android."); return false; }
  await Print.printAsync({ html: buildInvoiceHtml(lines, customerName, width), width: width === "58mm" ? 219 : 302, height: 1200 });
  return true;
}

export async function shareInvoicePdf(lines: InvoicePdfLine[], customerName?: string, phone?: string, width: "58mm" | "80mm" = "80mm") {
  try {
    const uri = await createInvoicePdf(lines, customerName, width);
    if (!uri) return null;
    if (!(await Sharing.isAvailableAsync())) throw new Error("sharing_unavailable");
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: phone ? `إرسال الفاتورة إلى ${phone}` : "مشاركة الفاتورة PDF" });
    if (phone && Platform.OS === "android") { const normalizedPhone = phone.replace(/[^0-9+]/g, ""); const whatsappUrl = `whatsapp://send?phone=${encodeURIComponent(normalizedPhone)}&text=${encodeURIComponent("السلام عليكم، مرفق فاتورتكم من بقالة العزي.")}`; if (await Linking.canOpenURL(whatsappUrl)) await Linking.openURL(whatsappUrl); }
    return uri;
  } catch { Alert.alert("تعذر مشاركة الفاتورة", "جرّب المشاركة من تطبيق آخر أو تأكد من وجود واتساب."); return null; }
}
