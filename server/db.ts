import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _dbUrl: string | null = null;

export async function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    _db = null;
    _dbUrl = null;
    return null;
  }
  if (!_db || _dbUrl !== url) {
    try {
      _db = drizzle(url);
      _dbUrl = url;
    } catch (error) {
      console.error("[Database] Failed to initialize:", error);
      _db = null;
      _dbUrl = null;
    }
  }
  return _db;
}

export async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE: قاعدة البيانات غير متصلة. تحقق من DATABASE_URL.");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await requireDb();
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    for (const field of textFields) {
      if (user[field] !== undefined) {
        const value = user[field] ?? null;
        values[field] = value;
        updateSet[field] = value;
      }
    }
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await requireDb();
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
