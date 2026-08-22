import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { BluetoothEscposPrinter, BluetoothManager } from "@mateusdegobi/react-native-bluetooth-escpos-printer";

export type ThermalPrinterDevice = { name: string; address: string };
const PRINTER_ADDRESS_KEY = "bagalah_alizzi_thermal_printer_address";
const PRINTER_NAME_KEY = "bagalah_alizzi_thermal_printer_name";
const Printer: any = BluetoothEscposPrinter as any;

const parseDevice = (value: any): ThermalPrinterDevice | null => {
  try {
    const item = typeof value === "string" ? JSON.parse(value) : value;
    if (!item?.address) return null;
    return { address: String(item.address), name: String(item.name || "طابعة حرارية") };
  } catch { return null; }
};

export async function getSavedThermalPrinter(): Promise<ThermalPrinterDevice | null> {
  if (Platform.OS !== "android") return null;
  const address = await AsyncStorage.getItem(PRINTER_ADDRESS_KEY);
  if (!address) return null;
  return { address, name: (await AsyncStorage.getItem(PRINTER_NAME_KEY)) || "طابعة حرارية" };
}

export async function saveThermalPrinter(device: ThermalPrinterDevice) {
  await AsyncStorage.multiSet([[PRINTER_ADDRESS_KEY, device.address], [PRINTER_NAME_KEY, device.name]]);
}
export async function clearSavedThermalPrinter() { await AsyncStorage.multiRemove([PRINTER_ADDRESS_KEY, PRINTER_NAME_KEY]); }
export async function isBluetoothEnabled() { if (Platform.OS !== "android") return false; return Boolean(await BluetoothManager.isBluetoothEnabled()); }

export async function enableBluetooth() {
  if (Platform.OS !== "android") return [];
  const result = await BluetoothManager.enableBluetooth();
  if (!Array.isArray(result)) return [];
  return result.map(parseDevice).filter(Boolean) as ThermalPrinterDevice[];
}

export async function scanThermalPrinters(): Promise<ThermalPrinterDevice[]> {
  if (Platform.OS !== "android") return [];
  const raw: any = await BluetoothManager.scanDevices();
  let parsed: any = raw;
  if (typeof raw === "string") { try { parsed = JSON.parse(raw); } catch { parsed = {}; } }
  const all = [...(parsed?.paired || []), ...(parsed?.found || [])];
  const unique = new Map<string, ThermalPrinterDevice>();
  all.map(parseDevice).filter(Boolean).forEach((device) => unique.set(device!.address, device!));
  return [...unique.values()];
}

export async function connectThermalPrinter(address: string) {
  if (Platform.OS !== "android") throw new Error("الطباعة الحرارية بالبلوتوث متاحة على Android.");
  await BluetoothManager.connect(address);
}
export async function disconnectThermalPrinter(address: string) { if (Platform.OS !== "android") return; try { await BluetoothManager.disconnect(address); } catch {} }

export async function printThermalReceipt(options: { lines: Array<{ name: string; quantity: number; unitPrice: number }>; customerName?: string; width?: "58mm" | "80mm" }) {
  if (Platform.OS !== "android") throw new Error("الطابعة الحرارية عبر Bluetooth متاحة على Android فقط.");
  const saved = await getSavedThermalPrinter();
  if (!saved) throw new Error("لم يتم اختيار طابعة حرارية. افتح الإعدادات واختر الطابعة أولًا.");
  await connectThermalPrinter(saved.address);
  await Printer.printerInit();
  const width = options.width === "58mm" ? 32 : 48;
  const separator = "-".repeat(width);
  const total = options.lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0);
  await Printer.printerAlign(Printer.ALIGN.CENTER);
  await Printer.printText("بقالة العزي للمواد الغذائية\n", { encoding: "UTF-8", widthtimes: 2, heigthtimes: 2, fonttype: 0 });
  await Printer.printText("فاتورة مبيعات\n", { encoding: "UTF-8" });
  await Printer.printText(`${new Date().toLocaleDateString("ar-SA")}\n`, { encoding: "UTF-8" });
  await Printer.printText(`${separator}\n`, { encoding: "UTF-8" });
  await Printer.printerAlign(Printer.ALIGN.LEFT);
  await Printer.printText(`العميل: ${options.customerName || "نقدي"}\n`, { encoding: "UTF-8" });
  await Printer.printText(`${separator}\n`, { encoding: "UTF-8" });
  for (const line of options.lines) {
    const lineTotal = Number(line.quantity || 0) * Number(line.unitPrice || 0);
    await Printer.printText(`${line.name}\n`, { encoding: "UTF-8" });
    await Printer.printText(`  ${line.quantity} × ${Number(line.unitPrice || 0).toFixed(2)} = ${lineTotal.toFixed(2)}\n`, { encoding: "UTF-8" });
  }
  await Printer.printText(`${separator}\n`, { encoding: "UTF-8" });
  await Printer.printerAlign(Printer.ALIGN.RIGHT);
  await Printer.printText(`الإجمالي: ${total.toFixed(2)} ر.س\n`, { encoding: "UTF-8", widthtimes: 2, heigthtimes: 2 });
  await Printer.printerAlign(Printer.ALIGN.CENTER);
  await Printer.printText("\nشكرًا لتعاملكم مع بقالة العزي\n\n\n", { encoding: "UTF-8" });
  return true;
}

export async function testThermalPrinter() {
  if (Platform.OS !== "android") throw new Error("اختبار الطابعة الحرارية متاح على Android فقط.");
  const saved = await getSavedThermalPrinter();
  if (!saved) throw new Error("اختر الطابعة أولًا.");
  await connectThermalPrinter(saved.address);
  await Printer.printerInit();
  await Printer.printerAlign(Printer.ALIGN.CENTER);
  await Printer.printText("بقالة العزي للمواد الغذائية\n", { encoding: "UTF-8", widthtimes: 2, heigthtimes: 2 });
  await Printer.printText("اختبار الطابعة الحرارية\n", { encoding: "UTF-8" });
  await Printer.printText(`${new Date().toLocaleString("ar-SA")}\n\n\n`, { encoding: "UTF-8" });
  return true;
}
