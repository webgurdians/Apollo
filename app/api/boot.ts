import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { validateRequestOrigin } from "./lib/origin";
import { getPrescriptionSecureToken, generatePrescriptionPdf } from "./lib/pdf";
import { getDb, resetDbConnection } from "./queries/connection";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import crypto from "crypto";
import Database from "better-sqlite3";

const __dirname = path.resolve(process.cwd(), "api");

export const bootLog: string[] = [];

function logInfo(...args: any[]) {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" ");
  console.log(msg);
  bootLog.push(`[INFO] ${msg}`);
}
function logError(...args: any[]) {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" ");
  console.error(msg);
  bootLog.push(`[ERROR] ${msg}`);
}

function getDatabasePath() {
  const url = env.databaseUrl;
  if (!url || url.startsWith("postgres:") || url.startsWith("postgresql:")) {
    return "sqlite.db";
  }
  return url;
}

// Run migrations automatically on server boot
try {
  const db = getDb();
  migrate(db, { migrationsFolder: path.resolve(__dirname, "../db/migrations") });
  logInfo("Database migrations applied successfully.");
} catch (error) {
  logError("Failed to run database migrations:", error);
  try {
    const fs = await import("fs");
    const dbPath = path.resolve(process.cwd(), getDatabasePath());
    if (fs.existsSync(dbPath)) {
      logInfo("Removing corrupted or mismatched database file:", dbPath);
      fs.unlinkSync(dbPath);
      // Reset connection instance cache
      resetDbConnection();
      // Re-run migrations on fresh database
      const freshDb = getDb();
      migrate(freshDb, { migrationsFolder: path.resolve(__dirname, "../db/migrations") });
      logInfo("Fresh database initialized and migrated successfully.");
      // Seed the fresh database
      runSeeding();
    }
  } catch (retryError) {
    logError("Failed to recover database:", retryError);
  }
}

// Ensure existing admin user has founder role (one-time fix for DBs seeded before founder role existed)
try {
  const fixDb = getDb();
  fixDb.$client.prepare(`UPDATE users SET role = 'founder' WHERE username = 'admin' AND role != 'founder'`).run();
} catch {}

// One-time fix: if doctors table is empty but users exist, re-run seeding to populate doctors
// This handles the case where admin was seeded but doctors failed due to a placeholder mismatch bug
try {
  const checkDb = getDb();
  const doctorCount = (checkDb.$client.prepare("SELECT COUNT(*) as count FROM doctors").get() as { count: number })?.count ?? 0;
  if (doctorCount === 0) {
    logInfo("Doctors table is empty — forcing re-seed of doctors and staff...");
    // Temporarily clear users so runSeeding() will re-seed everything
    // But only if users only has the admin (no real data yet)
    const userCount = (checkDb.$client.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number })?.count ?? 0;
    if (userCount <= 2) {
      // Fresh DB with only admin + possibly frontdesk — safe to re-seed
      checkDb.$client.prepare("DELETE FROM users").run();
      checkDb.$client.prepare("DELETE FROM doctors").run();
    }
  }
} catch {}


// Auto-seed admin user + doctors on fresh database
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function runSeeding() {
  try {
    // Reuse the same DB connection that migrations ran on (avoids path mismatch)
    const seedDb = getDb().$client;
    const row = seedDb.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (row.count === 0) {
    const now = Date.now();

    const seedAdminUser = process.env.SEED_ADMIN_USERNAME || "admin";
    const seedAdminPass = process.env.SEED_ADMIN_PASSWORD || "admin123";

    seedDb.prepare(`
      INSERT INTO users (username, passwordHash, name, role, createdAt, updatedAt, lastSignInAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(seedAdminUser, hashPassword(seedAdminPass), "Super Admin", "founder", now, now, now);
    console.log(`Seed: created admin user "${seedAdminUser}" (founder role)`);

    const pass = "apollo123";
    const doctors = [
      { username: "drvigneshthanik", name: "Dr. Vignesh Thanikgaivasan", img: "/images/vignesh.jpg", specialty: "Cardiology", credentials: "MBBS, MD (Gen Med), DM (Cardiology) AFAPSIC, FIMSA", reg: "REG-001", serviceName: "Dr. Vignesh Thanikgaivasan - Cardiology", branch: "Apollo Hospitals Greams Road, Chennai", fees: 1200, availability: "Monday & Saturday (11:00 AM – 3:00 PM)" },
      { username: "drnithyanarayan", name: "Dr. Nithya Narayanan", img: "/images/nithya.jpg", specialty: "ENT / Covid Consult", credentials: "MBBS, DLO, DNB (ENT), MNAMS", reg: "REG-002", serviceName: "Dr. Nithya Narayanan - ENT / Covid Consult", branch: "Apollo Hospitals Greams Road, Chennai", fees: 1200, availability: "Tuesday (10:00 AM – 2:00 PM)" },
      { username: "dranushad", name: "Dr. Anusha D", img: "/images/anusha.jpg", specialty: "Consultant Neurologist", credentials: "MBBS, MD, DM", reg: "REG-003", serviceName: "Dr. Anusha D - Consultant Neurologist", branch: "Apollo Hospitals OMR, Chennai", fees: 1200, availability: "Wednesday (9:00 AM – 1:00 PM)" },
      { username: "drjothiparthasa", name: "Dr. Jothi Parthasarathy S", img: "/images/jothi.jpg", specialty: "Neonatology / Pediatrics", credentials: "MBBS, MD (Paediatrics)", reg: "REG-004", serviceName: "Dr. Jothi Parthasarathy S - Neonatology", branch: "Apollo Children Hospitals Greams Road, Chennai", fees: 1200, availability: "Thursday (10:00 AM – 2:00 PM)" },
      { username: "drgauthamkrishna", name: "Dr. Gautham Krishnamurthy", img: "/images/gautham.jpg", specialty: "Surgical Gastroenterology & GI Oncology", credentials: "MBBS, MS (Gen Surg), MCh (Surgical Gastroenterology)", reg: "REG-005", serviceName: "Dr. Gautham Krishnamurthy - Surgical Gastroenterology & GI Oncology", branch: "Apollo Hospitals Greams Road, Chennai", fees: 1200, availability: "Friday (11:00 AM – 3:00 PM)" },
      { username: "drjatinsoni", name: "Dr. Jatin Soni", img: "/images/jatin.jpg", specialty: "Urology", credentials: "MBBS, MS (General Surgery), MCh (Urology)", reg: "REG-006", serviceName: "Dr. Jatin Soni - Urology", branch: "Apollo Hospitals Chennai", fees: 1200, availability: "Saturday (9:30 AM – 2:30 PM)" },
      { username: "drvishnuabishek", name: "Dr. Vishnu Abishek Raju", img: "/images/vishnu.jpg", specialty: "Gastroenterology / GI Medicine", credentials: "MBBS, MD (Internal Medicine), DM (Gastroenterology)", reg: "REG-007", serviceName: "Dr. Vishnu Abishek Raju - Gastroenterology", branch: "Apollo Hospitals Greams Road, Chennai", fees: 1200, availability: "Friday (11:00 AM – 3:00 PM)" },
      { username: "drrakeshshetty", name: "Dr. Rakesh Shetty", img: "/images/rakesh.jpg", specialty: "Orthopedics-Sports Medicine", credentials: "MBBS, DNB (Orthopaedic) Certified in spine and joint Replacement Surgeon (Languages: English, Telugu, Tamil, Kannada, Bengali, Tulu, Marathi, Hindi)", reg: "REG-008", serviceName: "Dr. Rakesh Shetty - Orthopedics-Sports Medicine", branch: "Apollo Hospitals Chennai", fees: 1200, availability: "Monday & Wednesday (2:00 PM – 5:00 PM)" },
    ];

    for (const doc of doctors) {
      seedDb.prepare(`
        INSERT INTO users (username, passwordHash, name, role, createdAt, updatedAt, lastSignInAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(doc.username, hashPassword(pass), doc.name, "doctor", now, now, now);

      const userRow = seedDb.prepare("SELECT id FROM users WHERE username = ?").get(doc.username) as { id: number };

      seedDb.prepare(`
        INSERT INTO doctors (name, credentials, specialty, registrationNumber, userId, serviceName, branch, image, fees, availability, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(doc.name, doc.credentials, doc.specialty, doc.reg, userRow.id, doc.serviceName, doc.branch, doc.img, doc.fees, doc.availability, "Available");
    }

    seedDb.prepare(`
      INSERT INTO users (username, passwordHash, name, role, createdAt, updatedAt, lastSignInAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run("frontdesk", hashPassword("front123"), "Front Desk Staff", "front_desk", now, now, now);
    console.log('Seed: created front_desk user "frontdesk"');

    console.log(`Seed: created ${doctors.length} doctor accounts`);

    seedDb.prepare(`
      INSERT INTO settings (key, value, updatedAt)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO NOTHING
    `).run("features", JSON.stringify({
      appointments: true,
      patients: true,
      billing: true,
      medicine_orders: true,
      contacts: true,
      staff: true,
      doctors: true,
      end_of_day_report: true,
      featured_doctor: true,
      report_dispatch: true,
      global_search: true,
    }), now);

    console.log(`Seed: created default feature flags`);
    console.log(`Login: "${seedAdminUser}" / "${seedAdminPass}" (founder)`);
    console.log(`Doctor password: "${pass}" for all doctors`);
    console.log('Front desk: "frontdesk" / "front123"');
  } else {
    const existingFlags = seedDb.prepare("SELECT value FROM settings WHERE key = 'features'").get() as { value?: string } | undefined;
    if (!existingFlags) {
      seedDb.prepare(`
        INSERT INTO settings (key, value, updatedAt)
        VALUES (?, ?, ?)
      `).run("features", JSON.stringify({
        appointments: true,
        patients: true,
        billing: true,
        medicine_orders: true,
        contacts: true,
        staff: true,
        doctors: true,
        end_of_day_report: true,
        featured_doctor: true,
        report_dispatch: true,
        global_search: true,
      }), Date.now());
      console.log("Seed: created default feature flags (existing users, no flags)");
    } else if (existingFlags.value) {
      try {
        const parsed = JSON.parse(existingFlags.value);
        if (parsed.report_dispatch === false) {
          parsed.report_dispatch = true;
          seedDb.prepare("UPDATE settings SET value = ?, updatedAt = ? WHERE key = 'features'").run(JSON.stringify(parsed), Date.now());
          console.log("Seed: patched existing feature flags to enable report_dispatch");
        }
      } catch (e) {}
    }
    const nullImages = seedDb.prepare("SELECT id, name FROM doctors WHERE image IS NULL OR image = ''").all() as { id: number; name: string }[];
    for (const doc of nullImages) {
      const nameLower = doc.name.replace(/^Dr\.\s*/i, "").toLowerCase();
      let imgPath = "/images/jatin.jpg";
      if (nameLower.includes("vignesh")) imgPath = "/images/vignesh.jpg";
      else if (nameLower.includes("nithya")) imgPath = "/images/nithya.jpg";
      else if (nameLower.includes("anusha")) imgPath = "/images/anusha.jpg";
      else if (nameLower.includes("jothi") || nameLower.includes("jyoti")) imgPath = "/images/jothi.jpg";
      else if (nameLower.includes("gautham")) imgPath = "/images/gautham.jpg";
      else if (nameLower.includes("vishnu")) imgPath = "/images/vishnu.jpg";
      else if (nameLower.includes("jatin")) imgPath = "/images/jatin.jpg";
      else if (nameLower.includes("rakesh")) imgPath = "/images/rakesh.jpg";
      seedDb.prepare("UPDATE doctors SET image = ? WHERE id = ?").run(imgPath, doc.id);
    }
    if (nullImages.length > 0) console.log(`Seed: fixed ${nullImages.length} doctor images`);

    console.log(`Seed: ${row.count} users exist, skipping auto-seed`);
  }
  } catch (error) {
    logError("Auto-seed error:", error);
  }
}

// Run seeding on boot
runSeeding();
import {
  prescriptions,
  patients,
  doctors,
  prescriptionMedicines,
  prescriptionTests,
} from "../db/schema";
import { eq } from "drizzle-orm";

import { cors } from "hono/cors";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// Enable CORS
app.use("/api/*", cors({
  origin: (origin) => {
    if (!origin) return "*";
    const allowed = env.allowedOrigins.includes(origin) || origin.endsWith("localhost:5173") || origin.endsWith("127.0.0.1:5173");
    return allowed ? origin : undefined;
  },
  credentials: true,
}));

// CSRF protection for state-changing requests
const CSRF_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
app.use("/api/*", async (c, next) => {
  if (CSRF_METHODS.has(c.req.method)) {
    const result = validateRequestOrigin(c.req.raw.headers);
    if (!result.ok) {
      return c.json({ error: "CSRF validation failed", detail: result.reason }, 403);
    }
  }
  await next();
});

// Public endpoint to download prescription PDF with secure token verification
app.get("/api/prescriptions/:id/pdf", async (c) => {
  const idStr = c.req.param("id");
  const id = parseInt(idStr, 10);
  const token = c.req.query("token");

  if (isNaN(id)) {
    return c.json({ error: "Invalid prescription ID" }, 400);
  }

  // Verify HMAC secure validation token
  if (!token || token !== getPrescriptionSecureToken(id)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const db = getDb();

  // Fetch prescription details
  const [prescription] = await db
    .select({
      id: prescriptions.id,
      patientId: prescriptions.patientId,
      diagnosisNotes: prescriptions.diagnosisNotes,
      createdAt: prescriptions.createdAt,
      patientName: patients.name,
      patientAge: patients.age,
      patientGender: patients.gender,
      patientPhone: patients.phone,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      doctorCredentials: doctors.credentials,
      doctorRegNumber: doctors.registrationNumber,
    })
    .from(prescriptions)
    .innerJoin(patients, eq(prescriptions.patientId, patients.id))
    .innerJoin(doctors, eq(prescriptions.doctorId, doctors.id))
    .where(eq(prescriptions.id, id))
    .limit(1);

  if (!prescription) {
    return c.json({ error: "Prescription not found" }, 404);
  }

  const medicines = await db
    .select()
    .from(prescriptionMedicines)
    .where(eq(prescriptionMedicines.prescriptionId, id));

  const tests = await db
    .select()
    .from(prescriptionTests)
    .where(eq(prescriptionTests.prescriptionId, id));

  try {
    const pdfBuffer = await generatePrescriptionPdf({
      ...prescription,
      medicines,
      tests,
    });

    c.header("Content-Type", "application/pdf");
    c.header("Content-Disposition", `inline; filename="prescription-${id}.pdf"`);
    return c.body(new Uint8Array(pdfBuffer));
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "Failed to generate PDF: " + errMsg }, 500);
  }
});

// Public health check endpoint for Railway
app.get("/health", (c) => c.json({ status: "ok" }, 200));

app.get("/api/debug-db", async (c) => {
  const fs = await import("fs");
  const dbPath = path.resolve(process.cwd(), getDatabasePath());
  const exists = fs.existsSync(dbPath);
  
  let tables: any[] = [];
  try {
    const db = getDb();
    tables = db.$client.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  } catch (e: any) {
    tables = [{ error: e.message }];
  }

  let migrationFiles: string[] = [];
  try {
    const migPath = path.resolve(__dirname, "../db/migrations");
    if (fs.existsSync(migPath)) {
      migrationFiles = fs.readdirSync(migPath);
    } else {
      migrationFiles = ["Migrations folder not found at " + migPath];
    }
  } catch (e: any) {
    migrationFiles = [{ error: e.message } as any];
  }

  return c.json({
    processCwd: process.cwd(),
    databasePath: dbPath,
    databaseExists: exists,
    tables,
    migrationFiles,
    bootLog,
    envDatabaseUrl: env.databaseUrl,
  });
});

app.all("/api/trpc/*", async (c) => {
  const res = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
    onError({ error, path }) {
      console.error(`tRPC Error on path ${path}:`, error);
    },
  });
  
  res.headers.forEach((value, key) => {
    c.header(key, value);
  });
  return c.body(res.body as ReadableStream | null, res.status as Parameters<typeof c.body>[1]);
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });
}
