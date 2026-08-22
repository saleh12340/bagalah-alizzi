import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, categories, customers, products, storeSettings, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * Creates useful demo data only when the corresponding tables are empty.
 * This makes a fresh installation immediately usable without overwriting
 * any real store data entered later.
 */
export async function ensureDemoData(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const [productCount, customerCount, settingsCount] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(products),
      db.select({ count: sql<number>`COUNT(*)` }).from(customers),
      db.select({ count: sql<number>`COUNT(*)` }).from(storeSettings),
    ]);

    if (Number(productCount[0]?.count ?? 0) === 0) {
      const categoryNames = ["مشروبات", "ألبان", "مواد غذائية", "معلبات", "حلويات وبسكويت", "منظفات ومستلزمات"];
      const existingCategories = await db.select().from(categories);
      const categoryMap = new Map(existingCategories.map((c) => [c.name, c.id]));
      for (const name of categoryNames) {
        if (!categoryMap.has(name)) {
          const result = await db.insert(categories).values({ name });
          categoryMap.set(name, Number(result[0].insertId));
        }
      }

      const demoProducts = [
        ["مياه معدنية 330 مل", "مشروبات", 0.35, 0.50, 60, 10],
        ["مياه معدنية 1.5 لتر", "مشروبات", 0.70, 1.00, 50, 10],
        ["عصير برتقال", "مشروبات", 1.25, 1.75, 35, 8],
        ["مشروب غازي 330 مل", "مشروبات", 1.00, 1.50, 45, 10],
        ["حليب كامل الدسم 1 لتر", "ألبان", 4.00, 5.00, 30, 6],
        ["لبن 1 لتر", "ألبان", 3.50, 4.50, 25, 5],
        ["زبادي", "ألبان", 0.90, 1.25, 40, 8],
        ["جبن مثلثات", "ألبان", 5.50, 7.00, 18, 4],
        ["خبز", "مواد غذائية", 0.80, 1.00, 50, 10],
        ["سكر 1 كجم", "مواد غذائية", 2.50, 3.25, 35, 8],
        ["أرز 1 كجم", "مواد غذائية", 3.50, 4.50, 30, 6],
        ["دقيق 1 كجم", "مواد غذائية", 2.75, 3.50, 25, 5],
        ["زيت طبخ 1 لتر", "مواد غذائية", 5.50, 7.00, 28, 6],
        ["شاي 250 جم", "مواد غذائية", 4.50, 6.00, 20, 5],
        ["قهوة 250 جم", "مواد غذائية", 7.00, 9.00, 15, 4],
        ["مكرونة 400 جم", "مواد غذائية", 1.80, 2.50, 40, 8],
        ["معجون طماطم", "معلبات", 1.50, 2.25, 30, 6],
        ["تونة", "معلبات", 2.75, 3.75, 24, 5],
        ["فول معلب", "معلبات", 1.75, 2.50, 24, 5],
        ["بسكويت شاي", "حلويات وبسكويت", 1.25, 1.75, 45, 10],
        ["شوكولاتة", "حلويات وبسكويت", 1.50, 2.25, 35, 8],
        ["مناديل ورقية", "منظفات ومستلزمات", 2.00, 3.00, 25, 5],
        ["صابون", "منظفات ومستلزمات", 1.25, 1.75, 30, 6],
        ["مسحوق غسيل 1 كجم", "منظفات ومستلزمات", 6.00, 8.00, 18, 4],
      ] as const;

      await db.insert(products).values(demoProducts.map(([name, category, purchasePrice, salePrice, stock, minStock]) => ({
        name,
        categoryId: categoryMap.get(category) ?? null,
        unit: "حبة",
        purchasePrice: purchasePrice.toFixed(2),
        salePrice: salePrice.toFixed(2),
        stock: stock.toFixed(3),
        minStock: minStock.toFixed(3),
        active: true,
      })));
    }

    if (Number(customerCount[0]?.count ?? 0) === 0) {
      await db.insert(customers).values([
        { name: "أحمد محمد", phone: "0500000001", address: "الحي الرئيسي", openingBalance: "35.00", notes: "عميل افتراضي" },
        { name: "محمد علي", phone: "0500000002", address: "السوق", openingBalance: "60.00", notes: "عميل افتراضي" },
        { name: "خالد عبدالله", phone: "0500000003", address: "الحي الغربي", openingBalance: "20.00", notes: "عميل افتراضي" },
        { name: "عبدالله صالح", phone: "0500000004", address: "الحي الشرقي", openingBalance: "0.00", notes: "عميل افتراضي" },
      ]);
    }

    if (Number(settingsCount[0]?.count ?? 0) === 0) {
      await db.insert(storeSettings).values({
        storeName: "بقالة العزي للمواد الغذائية",
        currency: "ر.س",
        receiptWidth: "80mm",
        autoPrint: false,
        printCopies: 1,
        showLogoOnReceipt: true,
        showUnitPriceOnReceipt: false,
        reportDefaultRange: "month",
        lowStockAlerts: true,
      });
    }
  } catch (error) {
    // Seeding must never prevent the application from opening.
    console.warn("[Database] Demo data initialization skipped:", error);
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
