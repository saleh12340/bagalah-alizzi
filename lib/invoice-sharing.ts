import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert, Linking, Platform } from "react-native";

export type InvoicePdfLine = { name: string; quantity: number; unitPrice: number };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[c] ?? c));
const formatMoney = (value: number) => `${value.toFixed(2)} ر.س`;

export function buildInvoiceHtml(
  lines: InvoicePdfLine[],
  customerName?: string,
  width: "58mm" | "80mm" = "80mm",
  options?: { storeName?: string; phone?: string; address?: string; logoDataUrl?: string },
) {
  const store = options?.storeName || "بقالة العزي للمواد الغذائية";
  const phone = options?.phone || "";
  const address = options?.address || "";
  const logo = options?.logoDataUrl;

  const total = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const rows = lines
    .map(
      (line) => `<tr><td style="text-align:right">${escapeHtml(line.name)}</td><td>${line.quantity}</td><td style="text-align:left">${formatMoney(line.quantity * line.unitPrice)}</td></tr>`,
    )
    .join("");

  const pageWidth = width === "58mm" ? "58mm" : "80mm";

  return `<!doctype html>
<html dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  @page{size:${pageWidth} auto;margin:0}
  *{box-sizing:border-box}
  body{width:${pageWidth};margin:0 auto;padding:8px 6px;font-family:Cairo, Arial, sans-serif;color:#17221D;direction:rtl;font-size:12px}
  .logo{max-width:120px;margin:0 auto 6px;text-align:center}
  .logo-text{font-size:20px;font-weight:900}
  .subtitle{text-align:center;color:#555;margin-bottom:9px;font-weight:700}
  .meta{border-bottom:1px dashed #777;padding-bottom:7px;margin-bottom:7px;font-size:10px;display:flex;justify-content:space-between;gap:5px}
  table{width:100%;border-collapse:collapse}
  th{border-bottom:1px solid #222;padding:6px 4px;font-size:11px}
  td{padding:6px 4px;border-bottom:1px dashed #bbb}
  td:first-child,th:first-child{text-align:right}
  .total{display:flex;justify-content:space-between;font-size:17px;font-weight:900;margin-top:10px;border-top:1px solid #222;padding-top:8px}
  .footer{text-align:center;margin-top:12px;font-size:10px;color:#666}
  .customer{margin:6px 0;font-weight:700}
</style>
</head>
<body>
  ${logo ? `<div class="logo"><img src="${logo}" style="max-width:100%;height:auto"/></div>` : `<div class="logo"><div class="logo-text">${escapeHtml(store)}</div></div>`}
  <div class="subtitle">فاتورة مبيعات</div>
  <div class="meta"><span class="customer">${customerName ? `العميل: ${escapeHtml(customerName)}` : ""}</span><span>تاريخ: ${new Date().toLocaleString("ar-SA")}</span></div>
  <table role="presentation">
    <thead><tr><th>البند</th><th>الكمية</th><th>المبلغ</th></tr></thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <div class="total"><span>الإجمالي</span><span>${formatMoney(total)}</span></div>
  <div class="footer">${escapeHtml(address)} ${phone ? ` - ${escapeHtml(phone)}` : ""}</div>
</body>
</html>`;
}

export async function createInvoicePdf(
  lines: InvoicePdfLine[],
  customerName?: string,
  width: "58mm" | "80mm" = "80mm",
  options?: { storeName?: string; phone?: string; address?: string; logoDataUrl?: string },
) {
  if (Platform.OS === "web") {
    Alert.alert("غير متاح", "تصدير PDF متاح داخل تطبيق Android/iOS.");
    return null;
  }

  const html = buildInvoiceHtml(lines, customerName, width, options);
  const result = await Print.printToFileAsync({ html, width: width === "58mm" ? 219 : 302, height: 1200 });
  return result.uri;
}

export async function printReceipt(
  lines: InvoicePdfLine[],
  customerName?: string,
  width: "58mm" | "80mm" = "80mm",
  options?: { storeName?: string; phone?: string; address?: string; logoDataUrl?: string },
) {
  if (Platform.OS === "web") {
    Alert.alert("غير متاح", "الطباعة متاحة داخل تطبيق Android/iOS.");
    return false;
  }
  await Print.printAsync({ html: buildInvoiceHtml(lines, customerName, width, options), width: width === "58mm" ? 219 : 302, height: 1200 });
  return true;
}

export async function shareInvoicePdf(
  lines: InvoicePdfLine[],
  customerName?: string,
  phone?: string,
  width: "58mm" | "80mm" = "80mm",
  options?: { storeName?: string; phone?: string; address?: string; logoDataUrl?: string },
) {
  try {
    const uri = await createInvoicePdf(lines, customerName, width, options);
    if (!uri) return null;

    if (!(await Sharing.isAvailableAsync())) throw new Error("sharing_unavailable");

    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: phone ? `إرسال الفاتورة إلى ${phone}` : "مشاركة الفاتورة PDF",
    });

    // Optional: try opening WhatsApp chat if phone is provided (Android only)
    if (phone && Platform.OS === "android") {
      try {
        const normalizedPhone = phone.replace(/[^0-9+]/g, "");
        const text = encodeURIComponent(`فاتورة من ${options?.storeName || "بقالة العزي"} - الإجمالي ${lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0).toFixed(2)} ر.س`);
        const whatsappUrl = `whatsapp://send?phone=${encodeURIComponent(normalizedPhone)}&text=${text}`;
        const can = await Linking.canOpenURL(whatsappUrl);
        if (can) await Linking.openURL(whatsappUrl);
      } catch (e) {
        // ignore whatsapp failures — sharing already happened
      }
    }

    return uri;
  } catch (err) {
    console.warn("shareInvoicePdf failed", err);
    Alert.alert("تعذر مشاركة الفاتورة", "جرّب المشاركة من تطبيق آخر أو تأكد من وجود تطبيق مشاركة/واتساب.");
    return null;
  }
}
