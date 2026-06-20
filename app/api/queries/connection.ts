import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

import fs from "fs";
import path from "path";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

export function getDb() {
  if (!instance) {
    let dbPath = env.databaseUrl;
    let sqlite: any;
    
    try {
      if (dbPath && dbPath !== ":memory:") {
        // Resolve path to make sure we handle relative/absolute paths correctly
        let resolvedPath = path.resolve(dbPath);
        
        // If the path exists and is a directory (often happens if a volume is mounted directly to the file path),
        // we use a database file inside that directory.
        if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
          console.log(`DATABASE_URL path ${resolvedPath} is a directory. Using sqlite.db inside it.`);
          resolvedPath = path.join(resolvedPath, "sqlite.db");
        }
        
        const dbDir = path.dirname(resolvedPath);
        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true });
          console.log(`Created database directory: ${dbDir}`);
        }
        
        // If the database file does not exist or is empty (size 0),
        // copy the pre-seeded sqlite.db from the app package to preserve existing data
        const isDbEmpty = !fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).size === 0;
        if (isDbEmpty) {
          const possiblePaths = [
            path.resolve(__dirname, "../sqlite.db"),
            path.resolve(process.cwd(), "sqlite.db"),
            path.resolve(process.cwd(), "app/sqlite.db"),
          ];
          
          let copied = false;
          for (const defaultDbPath of possiblePaths) {
            if (fs.existsSync(defaultDbPath) && defaultDbPath !== resolvedPath && fs.statSync(defaultDbPath).size > 0) {
              try {
                // Ensure target directory exists
                const targetDir = path.dirname(resolvedPath);
                if (!fs.existsSync(targetDir)) {
                  fs.mkdirSync(targetDir, { recursive: true });
                }
                // Overwrite the empty file
                fs.copyFileSync(defaultDbPath, resolvedPath);
                console.log(`Successfully copied pre-seeded database from ${defaultDbPath} to ${resolvedPath}`);
                copied = true;
                break;
              } catch (copyErr) {
                console.error(`Failed to copy database from ${defaultDbPath}:`, copyErr);
              }
            }
          }
          if (!copied) {
            console.log(`Pre-seeded database not found or copy failed. Will initialize fresh database.`);
          }
        }
        
        dbPath = resolvedPath;
      }
      sqlite = new Database(dbPath);
      
      // Auto-migrate tables (only for non-memory databases)
      if (dbPath !== ":memory:") {
        sqlite.exec(`
          CREATE TABLE IF NOT EXISTS medicine_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patientId INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            items TEXT NOT NULL,
            totalAmount INTEGER NOT NULL,
            paymentStatus TEXT DEFAULT 'pending' NOT NULL,
            deliveryStatus TEXT DEFAULT 'placed' NOT NULL,
            createdAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL,
            deletedAt INTEGER
          );
        `);

        // Check if medicineOrderId column exists in bills table
        const billsTableExists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bills';").get();
        if (billsTableExists) {
          const columns = sqlite.prepare("PRAGMA table_info(bills);").all() as { name: string }[];
          const hasMedicineOrderId = columns.some((c) => c.name === "medicineOrderId");
          if (!hasMedicineOrderId) {
            console.log("Migrating bills table to support nullable appointmentId and medicineOrderId...");
            sqlite.transaction(() => {
              sqlite.exec("ALTER TABLE bills RENAME TO bills_old;");
              sqlite.exec(`
                CREATE TABLE bills (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  appointmentId INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
                  medicineOrderId INTEGER REFERENCES medicine_orders(id) ON DELETE CASCADE,
                  amount INTEGER NOT NULL,
                  tax INTEGER DEFAULT 0 NOT NULL,
                  discount INTEGER DEFAULT 0 NOT NULL,
                  total INTEGER NOT NULL,
                  status TEXT DEFAULT 'unpaid' NOT NULL,
                  paymentMethod TEXT,
                  correctionNote TEXT,
                  lockedAt INTEGER,
                  createdAt INTEGER NOT NULL,
                  updatedAt INTEGER NOT NULL,
                  deletedAt INTEGER
                );
              `);
              sqlite.exec(`
                INSERT INTO bills (id, appointmentId, amount, tax, discount, total, status, paymentMethod, correctionNote, lockedAt, createdAt, updatedAt, deletedAt)
                SELECT id, appointmentId, amount, tax, discount, total, status, paymentMethod, correctionNote, lockedAt, createdAt, updatedAt, deletedAt FROM bills_old;
              `);
              sqlite.exec("DROP TABLE bills_old;");
            })();
            console.log("Bills table migration completed successfully.");
          }
        }
      }
    } catch (err) {
      console.error(`Failed to initialize database at ${dbPath || "default"}, falling back to local sqlite.db:`, err);
      sqlite = new Database("sqlite.db");
      
      try {
        sqlite.exec(`
          CREATE TABLE IF NOT EXISTS medicine_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patientId INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            items TEXT NOT NULL,
            totalAmount INTEGER NOT NULL,
            paymentStatus TEXT DEFAULT 'pending' NOT NULL,
            deliveryStatus TEXT DEFAULT 'placed' NOT NULL,
            createdAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL,
            deletedAt INTEGER
          );
        `);
        const fallbackBillsTableExists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bills';").get();
        if (fallbackBillsTableExists) {
          const columns = sqlite.prepare("PRAGMA table_info(bills);").all() as { name: string }[];
          const hasMedicineOrderId = columns.some((c) => c.name === "medicineOrderId");
          if (!hasMedicineOrderId) {
            sqlite.transaction(() => {
              sqlite.exec("ALTER TABLE bills RENAME TO bills_old;");
              sqlite.exec(`
                CREATE TABLE bills (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  appointmentId INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
                  medicineOrderId INTEGER REFERENCES medicine_orders(id) ON DELETE CASCADE,
                  amount INTEGER NOT NULL,
                  tax INTEGER DEFAULT 0 NOT NULL,
                  discount INTEGER DEFAULT 0 NOT NULL,
                  total INTEGER NOT NULL,
                  status TEXT DEFAULT 'unpaid' NOT NULL,
                  paymentMethod TEXT,
                  correctionNote TEXT,
                  lockedAt INTEGER,
                  createdAt INTEGER NOT NULL,
                  updatedAt INTEGER NOT NULL,
                  deletedAt INTEGER
                );
              `);
              sqlite.exec(`
                INSERT INTO bills (id, appointmentId, amount, tax, discount, total, status, paymentMethod, correctionNote, lockedAt, createdAt, updatedAt, deletedAt)
                SELECT id, appointmentId, amount, tax, discount, total, status, paymentMethod, correctionNote, lockedAt, createdAt, updatedAt, deletedAt FROM bills_old;
              `);
              sqlite.exec("DROP TABLE bills_old;");
            })();
          }
        }
      } catch (fallbackErr) {
        console.error("Failed to run migrations on fallback database:", fallbackErr);
      }
    }
    
    instance = drizzle(sqlite, { schema: fullSchema });
  }
  return instance;
}
