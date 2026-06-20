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
    let sqlite;
    
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
        
        // If the database file does not exist in the target directory,
        // copy the pre-seeded sqlite.db from the app package to preserve existing data
        if (!fs.existsSync(resolvedPath)) {
          const defaultDbPath = path.resolve(__dirname, "../sqlite.db");
          if (fs.existsSync(defaultDbPath)) {
            try {
              fs.copyFileSync(defaultDbPath, resolvedPath);
              console.log(`Successfully copied pre-seeded database from ${defaultDbPath} to ${resolvedPath}`);
            } catch (copyErr) {
              console.error(`Failed to copy pre-seeded database:`, copyErr);
            }
          } else {
            console.log(`Pre-seeded database not found at ${defaultDbPath}, will initialize fresh database.`);
          }
        }
        
        dbPath = resolvedPath;
      }
      sqlite = new Database(dbPath);
    } catch (err) {
      console.error(`Failed to initialize database at ${dbPath || "default"}, falling back to local sqlite.db:`, err);
      sqlite = new Database("sqlite.db");
    }
    
    instance = drizzle(sqlite, { schema: fullSchema });
  }
  return instance;
}
