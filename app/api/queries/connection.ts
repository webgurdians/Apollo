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
    if (dbPath && (dbPath.startsWith("postgres:") || dbPath.startsWith("postgresql:"))) {
      dbPath = "sqlite.db";
    }
    let sqlite: any;
    
    try {
      if (dbPath && dbPath !== ":memory:") {
        // Resolve path to handle absolute/relative paths correctly
        let resolvedPath = path.resolve(dbPath);
        
        // If directory, use sqlite.db inside it
        if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
          resolvedPath = path.join(resolvedPath, "sqlite.db");
        }
        
        const dbDir = path.dirname(resolvedPath);
        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true });
        }
        
        // If DB file does not exist or size 0, check if we can copy a pre-seeded one
        const isDbEmpty = !fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).size === 0;
        if (isDbEmpty) {
          const possiblePaths = [
            path.resolve(process.cwd(), "sqlite.db"),
            path.resolve(process.cwd(), "app/sqlite.db"),
          ];
          for (const defaultDbPath of possiblePaths) {
            if (fs.existsSync(defaultDbPath) && defaultDbPath !== resolvedPath && fs.statSync(defaultDbPath).size > 0) {
              try {
                fs.copyFileSync(defaultDbPath, resolvedPath);
                console.log(`Copied database template from ${defaultDbPath} to ${resolvedPath}`);
                break;
              } catch (e) {}
            }
          }
        }
        dbPath = resolvedPath;
      }
      sqlite = new Database(dbPath);
    } catch (err) {
      console.error(`Failed to initialize database at ${dbPath || "default"}, using local fallback:`, err);
      sqlite = new Database("sqlite.db");
    }
    
    instance = drizzle(sqlite, { schema: fullSchema });
  }
  return instance;
}

export function resetDbConnection() {
  instance = undefined as any;
}
