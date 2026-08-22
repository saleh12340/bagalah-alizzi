import AsyncStorage from "@react-native-async-storage/async-storage";

export type LocalProduct = { id: number; name: string; purchasePrice: number; salePrice: number; stock: number; minStock: number; unit: string };
export type LocalCustomer = { id: number; name: string; phone: string; balance: number };
export type LocalInvoice = { id: number; invoiceNo: string; date: string; customerId: number | null; customerName: string; total: number; paid: number; items: { productId: number; name: string; quantity: number; unitPrice: number }[] };
export type LocalExpense = { id: number; category: string; amount: number; date: string };
export type LocalState = { products: LocalProduct[]; customers: LocalCustomer[]; invoices: LocalInvoice[]; expenses: LocalExpense[]; nextId: number };

const KEY = "bagalah_alizzi_local_v2";

const defaultProducts: Omit<LocalProduct, "id">[] = [
  ["مياه معدنية 330مل",0.25,0.5,48,6,"حبة"],["مياه معدنية 600مل",0.35,0.75,48,6,"حبة"],["مياه معدنية 1.5 لتر",0.6,1.25,36,6,"حبة"],["مشروب غازي كولا",1.5,2.5,30,5,"حبة"],["مشروب غازي برتقال",1.5,2.5,30,5,"حبة"],["عصير مانجو",1.25,2.5,24,4,"حبة"],["عصير برتقال",1.25,2.5,24,4,"حبة"],["حليب طويل الأجل 1 لتر",2.2,3.25,18,4,"حبة"],["لبن 1 لتر",2.1,3.25,18,4,"حبة"],["زبادي",0.75,1.25,24,4,"حبة"],["سكر 1 كجم",2.1,2.75,20,4,"كيس"],["أرز 1 كجم",2.8,3.75,20,4,"كيس"],["دقيق 1 كجم",1.8,2.75,20,4,"كيس"],["زيت طبخ 1.5 لتر",6.5,8.5,12,3,"حبة"],["شاي 250 جم",4.5,6,15,3,"علبة"],["قهوة 250 جم",5,7,15,3,"علبة"],["بسكويت سادة",0.75,1.5,30,5,"حبة"],["بسكويت شوكولاتة",1,2,30,5,"حبة"],["شيبس بطاطس",0.75,1.5,30,5,"حبة"],["شوكولاتة",1.5,2.5,24,4,"حبة"],["مناديل ورقية",2.5,4,12,3,"عبوة"],["صابون",1.5,2.5,18,4,"حبة"],["معجون أسنان",3,4.5,12,3,"حبة"],["بطاريات AA",2,3.5,12,3,"علبة"]
].map(([name,purchasePrice,salePrice,stock,minStock,unit],i)=>({id:i+1,name:String(name),purchasePrice:Number(purchasePrice),salePrice:Number(salePrice),stock:Number(stock),minStock:Number(minStock),unit:String(unit)}));

const defaultCustomers: Omit<LocalCustomer,"id">[] = [
  {name:"أحمد محمد",phone:"777000001",balance:25},
  {name:"محمد علي",phone:"777000002",balance:40},
  {name:"عبدالله حسن",phone:"777000003",balance:15},
  {name:"سعيد صالح",phone:"777000004",balance:60},
];

export function seedState(): LocalState {
  return {
    products: defaultProducts,
    customers: defaultCustomers.map((c,i)=>({id:i+1,...c})),
    invoices: [],
    expenses: [],
    nextId: 100,
  };
}

export async function loadLocalState(): Promise<LocalState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) { const seeded=seedState(); await saveLocalState(seeded); return seeded; }
    const parsed=JSON.parse(raw) as LocalState;
    if (!Array.isArray(parsed.products) || !Array.isArray(parsed.customers)) throw new Error("invalid");
    if (parsed.products.length===0 && parsed.customers.length===0) { const seeded=seedState(); await saveLocalState(seeded); return seeded; }
    return parsed;
  } catch { const seeded=seedState(); await saveLocalState(seeded); return seeded; }
}

export async function saveLocalState(state: LocalState) { await AsyncStorage.setItem(KEY, JSON.stringify(state)); }
export async function resetLocalState() { const seeded=seedState(); await saveLocalState(seeded); return seeded; }
