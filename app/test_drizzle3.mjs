import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const tmpDir = "/tmp/test_cleanup_" + Date.now();
fs.mkdirSync(tmpDir);
const dbPath = path.join(tmpDir, "sqlite.db");

const db1 = new Database(dbPath);
db1.exec("CREATE TABLE patients (id INTEGER PRIMARY KEY, name TEXT)");
db1.prepare("INSERT INTO patients VALUES (1, 'test-person')").run();
db1.close();

const db2 = new Database(dbPath);
const d = drizzle(db2, { schema: {} });

const proto = Object.getOwnPropertyNames(Object.getPrototypeOf(d));
console.log("Drizzle prototype methods:", proto);
console.log("Keys:", Object.keys(d));
console.log("session:", typeof d.session);

if (d.session) {
  console.log("session keys:", Object.keys(d.session));
  console.log("session.session:", typeof d.session.session);
  if (d.session.session) {
    console.log("session.session keys:", Object.keys(d.session.session));
  }
}

// Try accessing via internal property
for (const key of Object.keys(d)) {
  console.log(`d.${key}:`, typeof d[key]);
}

db2.close();
fs.rmSync(tmpDir, { recursive: true });
