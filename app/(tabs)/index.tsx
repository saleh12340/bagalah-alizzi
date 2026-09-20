import React, { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { shareInvoicePdf, printReceipt } from "@/lib/invoice-sharing";
import { loadLocalState, saveLocalState, type LocalCustomer, type LocalExpense, type LocalInvoice, type LocalPayment, type LocalProduct, type LocalState } from "@/lib/local-store";
import { Card } from "@/components/ui/Card";
import { Stat as StatCard } from "@/components/ui/Stat";
import { ActionRow } from "@/components/ui/ActionRow";
import { FAB } from "@/components/ui/FAB";
import { Field } from "@/components/ui/Field";
import { trpc } from "@/lib/trpc";

type Section = "home" | "invoice" | "stock" | "customers" | "reports" | "expenses" | "settings";
const money = (v: any, c = "ر.س") => `${Number(v || 0).toFixed(2)} ${c}`;
const now = () => new Date().toISOString();

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const [section, setSection] = useState<Section>("home");
  const [state, setState] = useState<LocalState | null>(null);
  const [storeName, setStoreName] = useState("بقالة العزي للمواد الغذائية");
  const settingsQ = trpc.settings.get.useQuery(undefined, { retry: false });
  const saveState = async (next: LocalState) => { setState(next); await saveLocalState(next); };

  useEffect(() => {
    loadLocalState().then(setState).catch((e) => Alert.alert("خطأ", e?.message || "تعذر فتح البيانات المحلية."));
  }, []);
  useEffect(() => {
    if (settingsQ.data?.storeName) setStoreName(settingsQ.data.storeName);
  }, [settingsQ.data?.storeName]);

  if (!state) return <ScreenContainer className="px-4 pt-3" safeAreaClassName="bg-background"><View style={styles.loading}><Text>جارٍ فتح البيانات...</Text></View></ScreenContainer>;

  const lowStock = state.products.filter(p => p.stock <= p.minStock);
  const today = new Date(); today.setHours(0,0,0,0);
  const todayInvoices = state.invoices.filter(i => new Date(i.date) >= today);
  const todayExpenses = state.expenses.filter(e => new Date(e.date) >= today);
  const todaySales = todayInvoices.reduce((s,i) => s + i.total, 0);
  const todayProfit = todayInvoices.reduce((s,i) => s + i.items.reduce((a,x) => a + x.quantity * x.unitPrice, 0), 0) - todayExpenses.reduce((s,e)=>s+e.amount,0);

  const title = section === "home" ? "الرئيسية" : section === "invoice" ? "الفواتير" : section === "stock" ? "الأصناف والمخزون" : section === "customers" ? "الحسابات" : section === "reports" ? "التقارير" : section === "expenses" ? "المصروفات" : "الإعدادات";
  const go = (s: Section) => setSection(s);

  return <ScreenContainer className="px-4 pt-3" safeAreaClassName="bg-background">
    <View style={styles.page}>
      <View style={styles.header}>
        <View><Text style={[styles.brand,{color:colors.primary}]}>بقالة العزي</Text><Text style={[styles.title,{color:colors.foreground}]}>{title}</Text></View>
        <Pressable onPress={() => router.push("/settings")} style={[styles.iconBtn,{backgroundColor:colors.surface}]}><IconSymbol name="gearshape.fill" size={18} color={colors.primary}/></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {section === "home" && <View>
          <Card style={{marginBottom:12}}>
            <Text style={{color:colors.muted,fontSize:13}}>نظرة سريعة</Text>
            <Text style={{color:colors.foreground,fontSize:18,fontWeight:"800"}}>إدارة المبيعات والحسابات والمخزون</Text>
            <View style={styles.stats}>
              <StatCard label="مبيعات اليوم" value={money(todaySales)} accent/><StatCard label="فواتير اليوم" value={todayInvoices.length}/><StatCard label="منخفض" value={lowStock.length}/>
            </View>
          </Card>
          <Card style={{marginBottom:12}}>
            <Text style={styles.cardTitle}>اختصارات</Text>
            <ActionRow actions={[
              {icon:"plus",label:"فاتورة جديدة",onPress:()=>go("invoice")},
              {icon:"cube.box.fill",label:"المخزون",onPress:()=>go("stock")},
              {icon:"person.badge.plus",label:"عميل جديد",onPress:()=>go("customers")},
              {icon:"chart.bar.fill",label:"التقارير",onPress:()=>go("reports")}
            ]}/>
          </Card>
          <Card>
            <Text style={styles.cardTitle}>آخر الفواتير</Text>
            {state.invoices.slice().sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).slice(0,8).map(i=><Pressable key={i.id} onPress={()=>go("invoice")} style={[styles.listRow,{borderBottomColor:colors.border}]}>
              <View style={{flex:1}}><Text style={{color:colors.foreground,fontWeight:"800"}}>{i.invoiceNo}</Text><Text style={{color:colors.muted,fontSize:11}}>{i.customerName || "نقدي"} • {new Date(i.date).toLocaleString("ar-SA")}</Text></View><Text style={{color:colors.foreground,fontWeight:"900"}}>{money(i.total)}</Text>
            </Pressable>)}
            {!state.invoices.length && <Text style={{color:colors.muted,textAlign:"center",padding:18}}>لا توجد فواتير بعد</Text>}
          </Card>
          <View style={{height:90}}/>
        </View>}

        {section === "invoice" && <InvoiceView state={state} saveState={saveState} products={state.products} customers={state.customers} colors={colors} storeName={storeName} onBack={()=>go("home")}/>}
        {section === "stock" && <StockView state={state} saveState={saveState} colors={colors} onBack={()=>go("home")}/>}
        {section === "customers" && <CustomersView state={state} saveState={saveState} colors={colors} onBack={()=>go("home")} storeName={storeName}/>}
        {section === "expenses" && <ExpensesView state={state} saveState={saveState} colors={colors} onBack={()=>go("home")}/>}
        {section === "reports" && <ReportsView state={state} colors={colors} onBack={()=>go("home")} todayProfit={todayProfit}/>}
        {section === "settings" && <View><SettingsView colors={colors} onBack={()=>go("home")}/></View>}
      </ScrollView>
      <View style={[styles.bottomNav,{backgroundColor:colors.surface,borderTopColor:colors.border}]}>
        {([["home","الرئيسية","house.fill"],["invoice","الفواتير","receipt"],["stock","المخزون","cube.box.fill"],["customers","الحسابات","person.3.fill"],["reports","التقارير","chart.bar.fill"],["expenses","المصروفات","creditcard.fill"]] as const).map(([key,label,icon])=><Pressable key={key} onPress={()=>go(key)} style={styles.navItem}><IconSymbol name={icon} size={19} color={section===key?colors.primary:colors.muted}/><Text style={[styles.navLabel,{color:section===key?colors.primary:colors.muted}]}>{label}</Text></Pressable>)}
      </View>
      <FAB onPress={()=>go("invoice")}/>
    </View>
  </ScreenContainer>;
}

function InvoiceView({state,saveState,products,customers,colors,storeName,onBack}:{state:LocalState;saveState:(s:LocalState)=>Promise<void>;products:LocalProduct[];customers:LocalCustomer[];colors:any;storeName:string;onBack:()=>void}) {
  const [lines,setLines]=useState<LocalInvoice["items"]>([{productId:0,name:"",quantity:1,unitPrice:0}]);
  const [customerId,setCustomerId]=useState<number|null>(null);
  const [customerName,setCustomerName]=useState("");
  const [paid,setPaid]=useState("0");
  const [editId,setEditId]=useState<number|null>(null);
  const [notes,setNotes]=useState("");
  const total=useMemo(()=>lines.reduce((s,x)=>s+x.quantity*x.unitPrice,0),[lines]);
  const selectedCustomer=customers.find(c=>c.id===customerId);
  const updateLine=(idx:number,patch:Partial<LocalInvoice["items"][number]>)=>setLines(v=>v.map((x,i)=>i===idx?{...x,...patch}:x));
  const reset=()=>{setLines([{productId:0,name:"",quantity:1,unitPrice:0}]);setCustomerId(null);setCustomerName("");setPaid("0");setEditId(null);setNotes("");};
  const loadEdit=(invoice:LocalInvoice)=>{setEditId(invoice.id);setLines(invoice.items);setCustomerId(invoice.customerId);setCustomerName(invoice.customerName||"");setPaid(String(invoice.paid||0));setNotes("");};
  const save=async()=>{
    if(!lines.some(x=>x.name.trim()&&x.quantity>0&&x.unitPrice>=0)){Alert.alert("تنبيه","أدخل بندًا واحدًا على الأقل.");return;}
    const clean=lines.filter(x=>x.name.trim()&&x.quantity>0).map(x=>({...x,name:x.name.trim(),unitPrice:Number(x.unitPrice)||0}));
    if(!clean.length||total<=0){Alert.alert("تنبيه","تأكد من اسم الصنف والقيمة الإجمالية.");return;}
    const paidValue=Math.min(total,Math.max(0,Number(paid)||0));
    let next={...state,products:state.products.map(p=>({...p})),customers:state.customers.map(c=>({...c})),invoices:[...state.invoices]};
    const old=editId?next.invoices.find(i=>i.id===editId):null;
    if(old){
      for(const item of old.items){const p=next.products.find(p=>p.id===item.productId);if(p)p.stock+=item.quantity;}
      next.invoices=next.invoices.filter(i=>i.id!==editId);
    }
    const cid=customerId||null;
    const finalName=selectedCustomer?.name||customerName.trim();
    const id=editId||next.nextId++;
    const invoice:LocalInvoice={id,invoiceNo:old?.invoiceNo||`F-${Date.now()}`,date:now(),customerId:cid,customerName:finalName,total,paid:paidValue,items:clean};
    for(const item of clean){const p=next.products.find(p=>p.id===item.productId);if(p)p.stock=Math.max(0,p.stock-item.quantity);}
    next.invoices.push(invoice);
    if(old?.customerId){const oldCustomer=next.customers.find(c=>c.id===old.customerId);if(oldCustomer)oldCustomer.balance=Math.max(0,oldCustomer.balance-(old.total-old.paid));}
    if(cid){const c=next.customers.find(c=>c.id===cid);if(c)c.balance=Math.max(0,c.balance)+(total-paidValue);}
    await saveState(next);Alert.alert("تم الحفظ","تم حفظ الفاتورة في الجهاز.");reset();
  };
  const remove=async(id:number)=>{const inv=state.invoices.find(i=>i.id===id);if(!inv)return;const next={...state,products:state.products.map(p=>({...p}),),invoices:state.invoices.filter(i=>i.id!==id),customers:state.customers.map(c=>({...c}))};for(const item of inv.items){const p=next.products.find(p=>p.id===item.productId);if(p)p.stock+=item.quantity;}if(inv.customerId){const c=next.customers.find(c=>c.id===inv.customerId);if(c)c.balance=Math.max(0,c.balance-(inv.total-inv.paid));}await saveState(next);if(editId===id)reset();};
  const doPrint=async()=>{const clean=lines.filter(x=>x.name.trim()&&x.quantity>0).map(x=>({name:x.name,quantity:x.quantity,unitPrice:x.unitPrice}));if(!clean.length||total<=0){Alert.alert("تنبيه","احفظ الفاتورة بعد إدخال البيانات أولًا.");return;}try{await save();await printReceipt(clean,selectedCustomer?.name||customerName||undefined,"80mm");}catch(e:any){Alert.alert("خطأ في الطباعة",e?.message||"تعذر الطباعة.");}};
  const doShare=async()=>{const clean=lines.filter(x=>x.name.trim()&&x.quantity>0).map(x=>({name:x.name,quantity:x.quantity,unitPrice:x.unitPrice}));if(!clean.length||total<=0){Alert.alert("تنبيه","أدخل الفاتورة أولًا.");return;}try{await save();const uri=await shareInvoicePdf(clean,selectedCustomer?.name||customerName||undefined,selectedCustomer?.phone||undefined,"80mm",{storeName});if(!uri)Alert.alert("تنبيه","تعذر فتح نافذة المشاركة.");}catch(e:any){Alert.alert("خطأ في المشاركة",e?.message||"تعذر مشاركة الفاتورة.");}};
  return <View>
    <View style={styles.subHeader}><View><Text style={[styles.sectionTitle,{color:colors.foreground}]}>{editId?"تعديل الفاتورة":"فاتورة جديدة"}</Text><Text style={{color:colors.muted,fontSize:12}}>الحفظ محليًا على الجهاز</Text></View><Pressable onPress={onBack} style={styles.iconBtn}><IconSymbol name="xmark" size={20} color={colors.muted}/></Pressable></View>
    <Card>
      <Text style={[styles.fieldLabel,{color:colors.muted}]}>العميل</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{customers.map(c=><Pressable key={c.id} onPress={()=>{setCustomerId(c.id);setCustomerName(c.name)}} style={[styles.chip,{borderColor:customerId===c.id?colors.primary:colors.border,backgroundColor:customerId===c.id?colors.primary:colors.background}]}><Text style={{color:customerId===c.id?"#fff":colors.foreground,fontWeight:"700"}}>{c.name}</Text></Pressable>)}</ScrollView>
      <Field label="اسم العميل (اختياري)" value={customerName} onChangeText={t=>{setCustomerName(t);const c=customers.find(x=>x.name.trim()===t.trim());setCustomerId(c?.id||null)}} placeholder="اكتب أو اختر العميل"/>
      {lines.map((l,idx)=><View key={idx} style={[styles.invoiceLine,{borderColor:colors.border,backgroundColor:colors.background}]}>
        <View style={styles.invoiceHeaderRow}><Text style={[styles.lineHeader,{color:colors.muted}]}>الإجمالي</Text><Text style={[styles.lineHeader,{color:colors.muted}]}>الكمية</Text><Text style={[styles.lineHeader,{color:colors.muted,flex:1.35}]}>اسم الصنف</Text><Text style={[styles.lineHeader,{color:colors.muted}]}>سعر الوحدة</Text><Text style={[styles.lineHeader,{color:colors.muted}]}> </Text></View>
        <View style={styles.invoiceInputRow}>
          <TextInput value={String(l.quantity*l.unitPrice||"")} onChangeText={t=>{const totalValue=Number(t.replace(",","."))||0;const q=l.quantity||1;updateLine(idx,{unitPrice:q?totalValue/q:0})}} keyboardType="decimal-pad" placeholder="0" style={[styles.cellInput,styles.totalInput,{color:colors.foreground,borderColor:colors.border}]}/>
          <TextInput value={String(l.quantity)} onChangeText={t=>updateLine(idx,{quantity:Math.max(0,Number(t.replace(",","."))||0)})} keyboardType="decimal-pad" style={[styles.cellInput,{color:colors.foreground,borderColor:colors.border}]}/>
          <TextInput value={l.name} onChangeText={t=>{const p=products.find(p=>p.name.trim()===t.trim());updateLine(idx,{name:t,productId:p?.id||0,unitPrice:p?.salePrice||l.unitPrice})}} placeholder="اسم الصنف" style={[styles.cellInput,{flex:1.35,color:colors.foreground,borderColor:colors.border}]}/>
          <TextInput value={Number(l.unitPrice||0).toFixed(2)} editable={false} style={[styles.cellInput,styles.unitInput,{color:colors.muted,borderColor:colors.border}]}/>
          <Pressable onPress={()=>setLines(v=>v.length>1?v.filter((_,i)=>i!==idx):v)} style={styles.deleteCell}><Text style={{color:"#fff",fontWeight:"800"}}>×</Text></Pressable>
        </View>
      </View>)}
      <View style={styles.invoiceBottom}><Pressable onPress={()=>setLines(v=>[...v,{productId:0,name:"",quantity:1,unitPrice:0}])} style={styles.linkBtn}><Text style={{color:colors.primary,fontWeight:"800"}}>+ أضف بند</Text></Pressable><View><Text style={{color:colors.muted,textAlign:"right"}}>الإجمالي</Text><Text style={{color:colors.foreground,fontSize:21,fontWeight:"900"}}>{money(total)}</Text></View></View>
      <Field label="المدفوع" value={paid} onChangeText={setPaid} keyboardType="decimal-pad" placeholder="0"/>
      <Field label="ملاحظات" value={notes} onChangeText={setNotes} placeholder="اختياري"/>
      <View style={styles.actionGrid}><Pressable onPress={save} style={[styles.primaryBtn,{backgroundColor:colors.primary}]}><Text style={styles.primaryBtnText}>حفظ الفاتورة</Text></Pressable><Pressable onPress={doPrint} style={[styles.secondaryBtn,{borderColor:colors.border}]}><Text style={{color:colors.foreground,fontWeight:"800"}}>طباعة</Text></Pressable><Pressable onPress={doShare} style={[styles.secondaryBtn,{borderColor:colors.border}]}><Text style={{color:colors.foreground,fontWeight:"800"}}>مشاركة PDF</Text></Pressable></View>
      {editId&&<Pressable onPress={()=>Alert.alert("حذف الفاتورة","هل تريد حذفها؟", [{text:"إلغاء",style:"cancel"},{text:"حذف",style:"destructive",onPress:()=>remove(editId)}])} style={styles.dangerBtn}><Text style={styles.primaryBtnText}>حذف الفاتورة</Text></Pressable>}
    </Card>
    <Card style={{marginTop:12}}><Text style={styles.cardTitle}>الفواتير السابقة</Text>{state.invoices.slice().sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).slice(0,30).map(i=><Pressable key={i.id} onPress={()=>loadEdit(i)} style={[styles.listRow,{borderBottomColor:colors.border}]}><View style={{flex:1}}><Text style={{color:colors.foreground,fontWeight:"800"}}>{i.invoiceNo}</Text><Text style={{color:colors.muted,fontSize:11}}>{i.customerName||"نقدي"} • {new Date(i.date).toLocaleString("ar-SA")}</Text></View><Text style={{color:colors.foreground,fontWeight:"900"}}>{money(i.total)}</Text></Pressable>)}</Card>
    <View style={{height:90}}/>
  </View>;
}

function StockView({state,saveState,colors,onBack}:{state:LocalState;saveState:(s:LocalState)=>Promise<void>;colors:any;onBack:()=>void}) {
  const [name,setName]=useState("");const [salePrice,setSalePrice]=useState("");const [purchasePrice,setPurchasePrice]=useState("");const [stock,setStock]=useState("0");const [minStock,setMinStock]=useState("0");
  const add=async()=>{const price=Number(salePrice);if(!name.trim()||price<0){Alert.alert("تنبيه","أدخل اسم الصنف وسعر البيع.");return;}if(state.products.some(p=>p.name.trim().toLowerCase()===name.trim().toLowerCase())){Alert.alert("تنبيه","الصنف موجود مسبقًا. استخدم اسمه بدل إنشاء نسخة مكررة.");return;}const next={...state,products:[...state.products,{id:state.nextId++,name:name.trim(),purchasePrice:Number(purchasePrice)||0,salePrice:price,stock:Number(stock)||0,minStock:Number(minStock)||0,unit:"حبة"}]};await saveState(next);setName("");setSalePrice("");setPurchasePrice("");setStock("0");setMinStock("0");};
  const remove=async(id:number)=>{const next={...state,products:state.products.filter(p=>p.id!==id)};await saveState(next);};
  return <View><View style={styles.subHeader}><Text style={[styles.sectionTitle,{color:colors.foreground}]}>الأصناف والمخزون</Text><Pressable onPress={onBack} style={styles.iconBtn}><IconSymbol name="xmark" size={20} color={colors.muted}/></Pressable></View><Card><Field label="اسم الصنف" value={name} onChangeText={setName} placeholder="مثال: مياه"/><View style={styles.twoCol}><Field label="سعر الشراء" value={purchasePrice} onChangeText={setPurchasePrice} keyboardType="decimal-pad" placeholder="0"/><Field label="سعر البيع" value={salePrice} onChangeText={setSalePrice} keyboardType="decimal-pad" placeholder="0"/></View><View style={styles.twoCol}><Field label="الرصيد" value={stock} onChangeText={setStock} keyboardType="decimal-pad" placeholder="0"/><Field label="حد التنبيه" value={minStock} onChangeText={setMinStock} keyboardType="decimal-pad" placeholder="0"/></View><Pressable onPress={add} style={[styles.primaryBtn,{backgroundColor:colors.primary}]}><Text style={styles.primaryBtnText}>إضافة الصنف</Text></Pressable></Card><Card style={{marginTop:12}}>{state.products.map(p=><View key={p.id} style={[styles.listRow,{borderBottomColor:colors.border}]}><View style={{flex:1}}><Text style={{color:colors.foreground,fontWeight:"800"}}>{p.name}</Text><Text style={{color:colors.muted,fontSize:11}}>الرصيد {p.stock} • البيع {money(p.salePrice)}</Text></View>{p.stock<=p.minStock&&<Text style={{color:"#B42318",fontSize:11}}>منخفض</Text>}<Pressable onPress={()=>Alert.alert("حذف الصنف","هل تريد حذف الصنف؟",[{text:"إلغاء",style:"cancel"},{text:"حذف",style:"destructive",onPress:()=>remove(p.id)}])}><Text style={{color:"#B42318",fontWeight:"800"}}>حذف</Text></Pressable></View>)}</Card><View style={{height:90}}/></View>;
}

function CustomersView({state,saveState,colors,onBack,storeName}:{state:LocalState;saveState:(s:LocalState)=>Promise<void>;colors:any;onBack:()=>void;storeName:string}) {
  const [name,setName]=useState("");const [phone,setPhone]=useState("");const [selectedId,setSelectedId]=useState<number|null>(null);const [paymentAmount,setPaymentAmount]=useState("");const [paymentNotes,setPaymentNotes]=useState("");
  const selected=state.customers.find(c=>c.id===selectedId);
  const add=async()=>{if(!name.trim()){Alert.alert("تنبيه","أدخل اسم العميل.");return;}if(state.customers.some(c=>c.name.trim().toLowerCase()===name.trim().toLowerCase())){Alert.alert("تنبيه","هذا العميل موجود بالفعل.");return;}const next={...state,customers:[...state.customers,{id:state.nextId++,name:name.trim(),phone:phone.trim(),balance:0}]};await saveState(next);setName("");setPhone("");Alert.alert("تم","تم حفظ العميل على الجهاز.");};
  const pay=async()=>{const amount=Number(paymentAmount);if(!selected||amount<=0){Alert.alert("تنبيه","أدخل مبلغ الدفعة.");return;}const payment:LocalPayment={id:state.nextId++,customerId:selected.id,amount,date:now(),notes:paymentNotes.trim()||undefined};const next={...state,customers:state.customers.map(c=>c.id===selected.id?{...c,balance:Math.max(0,c.balance-amount)}:c),payments:[...(state.payments||[]),payment]};await saveState(next);setPaymentAmount("");setPaymentNotes("");};
  const statement=async()=>{if(!selected)return;const invs=state.invoices.filter(i=>i.customerId===selected.id);const pays=(state.payments||[]).filter(p=>p.customerId===selected.id);const lines=[...invs.map(i=>({name:`فاتورة ${i.invoiceNo}`,quantity:1,unitPrice:i.total})),...pays.map(p=>({name:`دفعة ${new Date(p.date).toLocaleDateString("ar-SA")}`,quantity:1,unitPrice:-p.amount}))];try{await shareInvoicePdf(lines,selected.name,selected.phone||undefined,"80mm",{storeName});}catch(e:any){Alert.alert("خطأ",e?.message||"تعذر مشاركة الكشف.");}};
  if(selected)return <View><View style={styles.subHeader}><View><Text style={[styles.sectionTitle,{color:colors.foreground}]}>{selected.name}</Text><Text style={{color:colors.muted,fontSize:11}}>{selected.phone||"بدون رقم"}</Text></View><Pressable onPress={()=>setSelectedId(null)} style={styles.iconBtn}><IconSymbol name="xmark" size={20} color={colors.muted}/></Pressable></View><Card><Text style={{color:colors.muted}}>الرصيد الحالي</Text><Text style={[styles.balance,{color:selected.balance>0?"#B42318":colors.primary}]}>{money(selected.balance)}</Text><Field label="مبلغ الدفعة" value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="decimal-pad" placeholder="0"/><Field label="بيان الدفعة" value={paymentNotes} onChangeText={setPaymentNotes} placeholder="اختياري"/><View style={styles.actionGrid}><Pressable onPress={pay} style={[styles.primaryBtn,{backgroundColor:colors.primary}]}><Text style={styles.primaryBtnText}>تسجيل الدفعة</Text></Pressable><Pressable onPress={statement} style={[styles.secondaryBtn,{borderColor:colors.border}]}><Text style={{color:colors.foreground,fontWeight:"800"}}>مشاركة الكشف</Text></Pressable></View>
      <Pressable onPress={()=>Alert.alert("حذف حساب العميل","سيتم حذف الحساب من الجهاز مع حركاته. هل تريد المتابعة؟",[{text:"إلغاء",style:"cancel"},{text:"حذف",style:"destructive",onPress:async()=>{const next={...state,customers:state.customers.filter(c=>c.id!==selected.id),invoices:state.invoices.map(i=>i.customerId===selected.id?{...i,customerId:null,customerName:""}:i),payments:(state.payments||[]).filter(p=>p.customerId!==selected.id)};await saveState(next);setSelectedId(null);}}])} style={styles.dangerBtn}><Text style={styles.primaryBtnText}>حذف حساب العميل</Text></Pressable>
    </Card><Card style={{marginTop:12}}><Text style={styles.cardTitle}>الحركات</Text>{state.invoices.filter(i=>i.customerId===selected.id).map(i=><View key={i.id} style={[styles.listRow,{borderBottomColor:colors.border}]}><View style={{flex:1}}><Text style={{color:colors.foreground,fontWeight:"700"}}>{i.invoiceNo}</Text><Text style={{color:colors.muted,fontSize:11}}>{new Date(i.date).toLocaleString("ar-SA")}</Text></View><Text style={{color:colors.foreground,fontWeight:"800"}}>{money(i.total)}</Text></View>)}{(state.payments||[]).filter(p=>p.customerId===selected.id).map(p=><View key={"p"+p.id} style={[styles.listRow,{borderBottomColor:colors.border}]}><View style={{flex:1}}><Text style={{color:colors.primary,fontWeight:"700"}}>دفعة</Text><Text style={{color:colors.muted,fontSize:11}}>{new Date(p.date).toLocaleString("ar-SA")}</Text></View><Text style={{color:colors.primary,fontWeight:"800"}}>-{money(p.amount)}</Text></View>)}</Card><View style={{height:90}}/></View>;
  return <View><View style={styles.subHeader}><Text style={[styles.sectionTitle,{color:colors.foreground}]}>الحسابات والعملاء</Text><Pressable onPress={onBack} style={styles.iconBtn}><IconSymbol name="xmark" size={20} color={colors.muted}/></Pressable></View><Card><Field label="اسم العميل" value={name} onChangeText={setName} placeholder="الاسم"/><Field label="رقم الجوال" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="رقم الجوال"/><Pressable onPress={add} style={[styles.primaryBtn,{backgroundColor:colors.primary}]}><Text style={styles.primaryBtnText}>إضافة العميل</Text></Pressable></Card><Card style={{marginTop:12}}>{state.customers.map(c=><Pressable key={c.id} onPress={()=>setSelectedId(c.id)} style={[styles.listRow,{borderBottomColor:colors.border}]}><View style={{flex:1}}><Text style={{color:colors.foreground,fontWeight:"800"}}>{c.name}</Text><Text style={{color:colors.muted,fontSize:11}}>{c.phone||"بدون رقم"}</Text></View><Text style={{color:c.balance>0?"#B42318":colors.primary,fontWeight:"900"}}>{money(c.balance)}</Text></Pressable>)}</Card><View style={{height:90}}/></View>;
}

function ExpensesView({state,saveState,colors,onBack}:{state:LocalState;saveState:(s:LocalState)=>Promise<void>;colors:any;onBack:()=>void}) {
  const [category,setCategory]=useState("");const [amount,setAmount]=useState("");const [notes,setNotes]=useState("");
  const add=async()=>{const value=Number(amount);if(!category.trim()||value<=0){Alert.alert("تنبيه","أدخل نوع المصروف والمبلغ.");return;}const next={...state,expenses:[...state.expenses,{id:state.nextId++,category:category.trim(),amount:value,date:now(),notes:notes.trim()||undefined}]};await saveState(next);setCategory("");setAmount("");setNotes("");};
  const remove=async(id:number)=>saveState({...state,expenses:state.expenses.filter(e=>e.id!==id)});
  return <View><View style={styles.subHeader}><Text style={[styles.sectionTitle,{color:colors.foreground}]}>المصروفات</Text><Pressable onPress={onBack} style={styles.iconBtn}><IconSymbol name="xmark" size={20} color={colors.muted}/></Pressable></View><Card><Field label="نوع المصروف" value={category} onChangeText={setCategory} placeholder="مثال: كهرباء"/><Field label="المبلغ" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00"/><Field label="ملاحظات" value={notes} onChangeText={setNotes} placeholder="اختياري"/><Pressable onPress={add} style={[styles.primaryBtn,{backgroundColor:colors.primary}]}><Text style={styles.primaryBtnText}>إضافة المصروف</Text></Pressable></Card><Card style={{marginTop:12}}>{state.expenses.map(e=><View key={e.id} style={[styles.listRow,{borderBottomColor:colors.border}]}><View style={{flex:1}}><Text style={{color:colors.foreground,fontWeight:"800"}}>{e.category}</Text><Text style={{color:colors.muted,fontSize:11}}>{e.notes||new Date(e.date).toLocaleString("ar-SA")}</Text></View><Text style={{color:colors.foreground,fontWeight:"800"}}>{money(e.amount)}</Text><Pressable onPress={()=>Alert.alert("حذف المصروف","هل تريد حذفه؟",[{text:"إلغاء",style:"cancel"},{text:"حذف",style:"destructive",onPress:()=>remove(e.id)}])}><Text style={{color:"#B42318",fontWeight:"800"}}>حذف</Text></Pressable></View>)}</Card><View style={{height:90}}/></View>;
}

function ReportsView({state,colors,onBack,todayProfit}:{state:LocalState;colors:any;onBack:()=>void;todayProfit:number}) {
  const today=new Date();today.setHours(0,0,0,0);
  const invoices=state.invoices.filter(i=>new Date(i.date)>=today);const expenses=state.expenses.filter(e=>new Date(e.date)>=today);
  const sales=invoices.reduce((s,i)=>s+i.total,0);const exp=expenses.reduce((s,e)=>s+e.amount,0);const debt=state.customers.reduce((s,c)=>s+c.balance,0);
  return <View><View style={styles.subHeader}><Text style={[styles.sectionTitle,{color:colors.foreground}]}>التقارير</Text><Pressable onPress={onBack} style={styles.iconBtn}><IconSymbol name="xmark" size={20} color={colors.muted}/></Pressable></View><Card><Text style={styles.cardTitle}>ملخص اليوم</Text><View style={styles.reportRow}><Text style={{color:colors.muted}}>المبيعات</Text><Text style={{color:colors.foreground,fontWeight:"900"}}>{money(sales)}</Text></View><View style={styles.reportRow}><Text style={{color:colors.muted}}>الفواتير</Text><Text style={{color:colors.foreground,fontWeight:"900"}}>{invoices.length}</Text></View><View style={styles.reportRow}><Text style={{color:colors.muted}}>المصروفات</Text><Text style={{color:colors.foreground,fontWeight:"900"}}>{money(exp)}</Text></View><View style={styles.reportRow}><Text style={{color:colors.muted}}>صافي الحركة</Text><Text style={{color:colors.primary,fontWeight:"900"}}>{money(sales-exp)}</Text></View><View style={styles.reportRow}><Text style={{color:colors.muted}}>إجمالي ديون العملاء</Text><Text style={{color:debt>0?"#B42318":colors.primary,fontWeight:"900"}}>{money(debt)}</Text></View><View style={styles.reportRow}><Text style={{color:colors.muted}}>المخزون المنخفض</Text><Text style={{color:colors.foreground,fontWeight:"900"}}>{state.products.filter(p=>p.stock<=p.minStock).length}</Text></View></Card><View style={{height:90}}/></View>;
}

function SettingsView({colors,onBack}:{colors:any;onBack:()=>void}) {
  const settingsQ=trpc.settings.get.useQuery(undefined,{retry:false});const update=trpc.settings.update.useMutation({onSuccess:()=>Alert.alert("تم","تم حفظ الإعدادات.")});
  const [store,setStore]=useState("بقالة العزي للمواد الغذائية");const [phone,setPhone]=useState("776425052");const [address,setAddress]=useState("");
  useEffect(()=>{if(settingsQ.data){setStore(settingsQ.data.storeName||store);setPhone(settingsQ.data.phone||"776425052");setAddress(settingsQ.data.address||"")}},[settingsQ.data]);
  return <View><View style={styles.subHeader}><Text style={[styles.sectionTitle,{color:colors.foreground}]}>الإعدادات</Text><Pressable onPress={onBack} style={styles.iconBtn}><IconSymbol name="xmark" size={20} color={colors.muted}/></Pressable></View><Card><Field label="اسم المتجر" value={store} onChangeText={setStore}/><Field label="الهاتف" value={phone} onChangeText={setPhone} keyboardType="phone-pad"/><Field label="العنوان" value={address} onChangeText={setAddress}/><Pressable onPress={()=>update.mutate({storeName:store.trim()||"بقالة العزي للمواد الغذائية",phone:phone.trim()||undefined,address:address.trim()||undefined,currency:"ر.س",receiptWidth:"80mm"})} style={[styles.primaryBtn,{backgroundColor:colors.primary}]}><Text style={styles.primaryBtnText}>حفظ الإعدادات</Text></Pressable><Text style={{color:colors.muted,fontSize:11,textAlign:"right",marginTop:8}}>لإعداد الطابعة الحرارية واختيارها افتح شاشة الإعدادات المتقدمة من رمز ⚙ في أعلى التطبيق.</Text></Card><View style={{height:90}}/></View>;
}

const styles=StyleSheet.create({
  page:{flex:1},loading:{flex:1,alignItems:"center",justifyContent:"center"},scroll:{paddingBottom:90},header:{flexDirection:"row-reverse",alignItems:"center",justifyContent:"space-between",marginBottom:12},brand:{fontSize:13,fontWeight:"800"},title:{fontSize:19,fontWeight:"900"},iconBtn:{padding:8,borderRadius:10},stats:{flexDirection:"row-reverse",gap:8,marginTop:12},cardTitle:{color:"#666",fontWeight:"800",marginBottom:8},subHeader:{flexDirection:"row-reverse",alignItems:"center",justifyContent:"space-between",marginBottom:12},sectionTitle:{fontSize:18,fontWeight:"900"},listRow:{flexDirection:"row-reverse",alignItems:"center",paddingVertical:11,gap:9,borderBottomWidth:1},primaryBtn:{minHeight:48,borderRadius:12,alignItems:"center",justifyContent:"center",paddingHorizontal:14,marginTop:8},primaryBtnText:{color:"#fff",fontWeight:"900"},secondaryBtn:{minHeight:48,borderWidth:1,borderRadius:12,alignItems:"center",justifyContent:"center",paddingHorizontal:12,flex:1},dangerBtn:{minHeight:46,borderRadius:12,backgroundColor:"#B42318",alignItems:"center",justifyContent:"center",marginTop:9},actionGrid:{flexDirection:"row-reverse",gap:8,marginTop:8},twoCol:{flexDirection:"row-reverse",gap:8},twoColChild:{flex:1},fieldLabel:{fontSize:12,fontWeight:"800",marginBottom:6},chips:{flexDirection:"row-reverse",gap:7,paddingBottom:8},chip:{borderWidth:1,borderRadius:18,paddingHorizontal:12,paddingVertical:8},invoiceLine:{borderWidth:1,borderRadius:12,padding:8,marginTop:10},invoiceHeaderRow:{flexDirection:"row-reverse",gap:4,marginBottom:5},invoiceInputRow:{flexDirection:"row-reverse",gap:4,alignItems:"center",minWidth:0},lineHeader:{flex:1,fontSize:9,textAlign:"center"},,cellInput:{flex:1,minHeight:44,borderWidth:1,borderRadius:9,paddingHorizontal:6,textAlign:"right",fontSize:11},totalInput:{fontWeight:"900",backgroundColor:"rgba(0,0,0,0.03)"},unitInput:{backgroundColor:"rgba(0,0,0,0.02)"},deleteCell:{width:34,height:44,borderRadius:9,backgroundColor:"#B42318",alignItems:"center",justifyContent:"center"},invoiceBottom:{flexDirection:"row-reverse",justifyContent:"space-between",alignItems:"center",marginTop:10},linkBtn:{padding:8},balance:{fontSize:28,fontWeight:"900",marginBottom:10},reportRow:{flexDirection:"row-reverse",justifyContent:"space-between",paddingVertical:9,borderBottomWidth:1,borderBottomColor:"rgba(128,128,128,0.18)"},bottomNav:{position:"absolute",left:0,right:0,bottom:0,minHeight:68,borderTopWidth:1,flexDirection:"row-reverse",justifyContent:"space-around",alignItems:"center",paddingHorizontal:3},navItem:{flex:1,alignItems:"center",justifyContent:"center",paddingVertical:7},navLabel:{fontSize:9,marginTop:3,fontWeight:"700"}
});
