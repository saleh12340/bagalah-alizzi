import AsyncStorage from "@react-native-async-storage/async-storage";

export type LocalProduct = { id:number; name:string; purchasePrice:number; salePrice:number; stock:number; minStock:number; unit:string };
export type LocalCustomer = { id:number; name:string; phone:string; balance:number };
export type LocalInvoice = { id:number; invoiceNo:string; date:string; customerId:number|null; customerName:string; total:number; paid:number; items:{productId:number;name:string;quantity:number;unitPrice:number}[] };
export type LocalExpense = { id:number; category:string; amount:number; date:string };
export type LocalState = { products:LocalProduct[]; customers:LocalCustomer[]; invoices:LocalInvoice[]; expenses:LocalExpense[]; nextId:number };

const KEY="bagalah_alizzi_local_v2";
const BACKUP_KEY="bagalah_alizzi_local_v2_last_good";
let lastStorageNotice="";

const productSeeds=[
  ["مياه معدنية 330مل",0.25,0.5,48,6,"حبة"],["مياه معدنية 600مل",0.35,0.75,48,6,"حبة"],["مياه معدنية 1.5 لتر",0.6,1.25,36,6,"حبة"],["مشروب غازي كولا",1.5,2.5,30,5,"حبة"],["مشروب غازي برتقال",1.5,2.5,30,5,"حبة"],["عصير مانجو",1.25,2.5,24,4,"حبة"],["عصير برتقال",1.25,2.5,24,4,"حبة"],["حليب طويل الأجل 1 لتر",2.2,3.25,18,4,"حبة"],["لبن 1 لتر",2.1,3.25,18,4,"حبة"],["زبادي",0.75,1.25,24,4,"حبة"],["سكر 1 كجم",2.1,2.75,20,4,"كيس"],["أرز 1 كجم",2.8,3.75,20,4,"كيس"],["دقيق 1 كجم",1.8,2.75,20,4,"كيس"],["زيت طبخ 1.5 لتر",6.5,8.5,12,3,"حبة"],["شاي 250 جم",4.5,6,15,3,"علبة"],["قهوة 250 جم",5,7,15,3,"علبة"],["بسكويت سادة",0.75,1.5,30,5,"حبة"],["بسكويت شوكولاتة",1,2,30,5,"حبة"],["شيبس بطاطس",0.75,1.5,30,5,"حبة"],["شوكولاتة",1.5,2.5,24,4,"حبة"],["مناديل ورقية",2.5,4,12,3,"عبوة"],["صابون",1.5,2.5,18,4,"حبة"],["معجون أسنان",3,4.5,12,3,"حبة"],["بطاريات AA",2,3.5,12,3,"علبة"]
] as const;
const defaultProducts:LocalProduct[]=productSeeds.map(([name,purchasePrice,salePrice,stock,minStock,unit],i)=>({id:i+1,name,purchasePrice,salePrice,stock,minStock,unit}));
const defaultCustomers:LocalCustomer[]=[{id:1,name:"أحمد محمد",phone:"777000001",balance:25},{id:2,name:"محمد علي",phone:"777000002",balance:40},{id:3,name:"عبدالله حسن",phone:"777000003",balance:15},{id:4,name:"سعيد صالح",phone:"777000004",balance:60}];

export function seedState():LocalState{return{products:defaultProducts,customers:defaultCustomers,invoices:[],expenses:[],nextId:100};}

function validateState(value:unknown):value is LocalState{
  if(!value||typeof value!=="object") return false;
  const v=value as Partial<LocalState>;
  return Array.isArray(v.products)&&Array.isArray(v.customers)&&Array.isArray(v.invoices)&&Array.isArray(v.expenses)&&typeof v.nextId==="number";
}

export function getLocalStorageNotice(){return lastStorageNotice;}
export function clearLocalStorageNotice(){lastStorageNotice="";}

export async function loadLocalState():Promise<LocalState>{
  lastStorageNotice="";
  try{
    const raw=await AsyncStorage.getItem(KEY);
    if(raw===null){
      const seeded=seedState();
      await saveLocalState(seeded);
      lastStorageNotice="تم إنشاء البيانات الافتراضية لأول تشغيل فقط.";
      return seeded;
    }

    try{
      const parsed:unknown=JSON.parse(raw);
      if(!validateState(parsed)) throw new Error("invalid");
      return parsed;
    }catch{
      // Never discard or silently replace unreadable user data.
      await AsyncStorage.setItem(BACKUP_KEY,raw);
      const backup=await AsyncStorage.getItem(BACKUP_KEY);
      if(backup){
        try{
          const recovered:unknown=JSON.parse(backup);
          if(validateState(recovered)){
            lastStorageNotice="تعذر قراءة قاعدة البيانات الحالية. تم الاحتفاظ بنسختها ولم يتم حذفها، وتم استخدام آخر نسخة سليمة.";
            return recovered;
          }
        }catch{}
      }
      lastStorageNotice="تعذر قراءة قاعدة البيانات المحلية. لم يتم حذف أو استبدال البيانات الموجودة. استخدم النسخ الاحتياطي والاستعادة قبل متابعة الكتابة.";
      return seedState();
    }
  }catch(error){
    lastStorageNotice=`تعذر الوصول إلى قاعدة البيانات المحلية. لم يتم استبدال بياناتك. ${error instanceof Error?error.message:"خطأ غير معروف"}`;
    return seedState();
  }
}

export async function saveLocalState(state:LocalState){
  const current=await AsyncStorage.getItem(KEY);
  if(current!==null) await AsyncStorage.setItem(BACKUP_KEY,current);
  await AsyncStorage.setItem(KEY,JSON.stringify(state));
}

export async function resetLocalState(){
  // Explicit reset only: keep the current database as a recoverable backup.
  const current=await AsyncStorage.getItem(KEY);
  if(current!==null) await AsyncStorage.setItem(BACKUP_KEY,current);
  const seeded=seedState();
  await AsyncStorage.setItem(KEY,JSON.stringify(seeded));
  lastStorageNotice="تمت إعادة البيانات إلى البيانات الافتراضية بطلب صريح، وتم الاحتفاظ بالنسخة السابقة كنسخة احتياطية.";
  return seeded;
}
