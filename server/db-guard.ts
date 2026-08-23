import { getDb } from "./db";

export async function requireDb() {
  const db = await getDb();
  if (!db) {
    throw new Error("DATABASE_UNAVAILABLE: قاعدة البيانات غير متصلة. تحقق من DATABASE_URL وتشغيل خادم MySQL.");
  }
  return db;
}
