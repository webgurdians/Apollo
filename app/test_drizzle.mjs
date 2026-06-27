import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { sql } from "drizzle-orm";
import path from "path";
import fs from "fs";

const tmpDir = "/tmp/test_cleanup_" + Date.now();
fs.mkdirSync(tmpDir);
const dbPath = path.join(tmpDir, "sqlite.db");

const db1 = new Database(dbPath);
db1.exec("CREATE TABLE patients (id INTEGER PRIMARY KEY, name TEXT)");
db1.prepare("INSERT INTO patients VALUES (1, 'test-person')").run();
console.log("Before:", JSON.stringify(db1.prepare("SELECT COUNT(*) as c FROM patients").get()));
db1.close();

const db2 = new Database(dbPath);
const d = drizzle(db2, { schema: {} });
try {
  const r = d.run(sql`DELETE FROM patients`);
  console.log("Drizzle .run result:", JSON.stringify(r));
} catch (e) {
  console.log("Drizzle .run error:", e.message);
}
db2.close();

const db3 = new Database(dbPath);
console.log("After:", JSON.stringify(db3.prepare("SELECT COUNT(*) as c FROM patients").get()));
db3.close();
fs.rmSync(tmpDir, { recursive: true });
