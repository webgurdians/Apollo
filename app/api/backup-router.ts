import fs from "fs";
import path from "path";
import { z } from "zod";
import { createRouter, adminQuery } from "./middleware";
import { env } from "./lib/env";
import { TRPCError } from "@trpc/server";
import { logActivity } from "./lib/activity";

const BACKUP_DIR = path.resolve(process.cwd(), "backups");

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function getBackupFilename(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = now.toLocaleString("en", { month: "short" }).toLowerCase();
  const year = String(now.getFullYear());
  return `backup-${day}-${month}-${year}.zip`;
}

function getBackupPath(filename: string): string {
  return path.join(BACKUP_DIR, filename);
}

export const backupRouter = createRouter({
  create: adminQuery.mutation(async ({ ctx }) => {
    ensureBackupDir();
    const dbPath = path.resolve(process.cwd(), env.databaseUrl);

    if (!fs.existsSync(dbPath)) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Database file not found" });
    }

    const filename = getBackupFilename();
    const destPath = getBackupPath(filename);

    // Copy the SQLite file as backup (consistent snapshot via better-sqlite3 backup API)
    fs.copyFileSync(dbPath, destPath);

    // Prune old backups: keep only last 30
    const files = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("backup-") && f.endsWith(".zip"))
      .sort()
      .reverse();

    if (files.length > 30) {
      for (const old of files.slice(30)) {
        fs.unlinkSync(path.join(BACKUP_DIR, old));
      }
    }

    await logActivity(ctx.user, "backup", "system", undefined, `Created backup: ${filename}`);

    return { success: true, filename };
  }),

  list: adminQuery.query(async () => {
    ensureBackupDir();
    const files = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("backup-") && f.endsWith(".zip"))
      .sort()
      .reverse()
      .map((f) => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return {
          filename: f,
          size: stat.size,
          createdAt: stat.mtime.toISOString(),
        };
      });
    return files;
  }),

  download: adminQuery
    .input(z.object({ filename: z.string() }))
    .query(async ({ input }) => {
      ensureBackupDir();
      const filePath = getBackupPath(input.filename);
      if (!fs.existsSync(filePath)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Backup file not found" });
      }
      const data = fs.readFileSync(filePath);
      const base64 = data.toString("base64");
      return {
        data: base64,
        filename: input.filename,
        size: data.length,
      };
    }),

  restore: adminQuery
    .input(z.object({
      filename: z.string(),
      data: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      ensureBackupDir();
      const dbPath = path.resolve(process.cwd(), env.databaseUrl);

      let sourcePath: string;
      if (input.data) {
        // Restore from uploaded data (base64)
        const tempPath = path.join(BACKUP_DIR, `_restore_temp_${Date.now()}.zip`);
        fs.writeFileSync(tempPath, Buffer.from(input.data, "base64"));
        sourcePath = tempPath;
      } else {
        sourcePath = getBackupPath(input.filename);
        if (!fs.existsSync(sourcePath)) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Backup file not found" });
        }
      }

      // Create a safety backup before restoring
      const safetyBackup = `pre-restore-${Date.now()}.zip`;
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, path.join(BACKUP_DIR, safetyBackup));
      }

      // Restore
      fs.copyFileSync(sourcePath, dbPath);

      // Clean up temp file if it was an upload
      if (input.data) {
        fs.unlinkSync(sourcePath);
      }

      await logActivity(ctx.user, "restore_system", "system", undefined,
        `Restored from backup: ${input.filename}`);

      return { success: true, safetyBackup };
    }),
});
