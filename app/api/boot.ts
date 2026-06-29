import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { validateRequestOrigin } from "./lib/origin";
import { getPrescriptionSecureToken, generatePrescriptionPdf, generateReceiptPdf } from "./lib/pdf";
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
  // Do NOT delete the database! Just run the manual schema fallback creation
  // to ensure all tables exist, keeping existing data safe.
  try {
    logInfo("Running database schema manual fallback...");
    const db = getDb();
    const sqlite = db.$client;
    
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        passwordHash TEXT NOT NULL,
        name TEXT,
        email TEXT,
        avatar TEXT,
        role TEXT DEFAULT 'user' NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        lastSignInAt INTEGER NOT NULL,
        deletedAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS doctors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        credentials TEXT NOT NULL,
        specialty TEXT NOT NULL,
        registrationNumber TEXT NOT NULL,
        signatureImageUrl TEXT,
        userId INTEGER NOT NULL,
        serviceName TEXT,
        branch TEXT,
        image TEXT,
        fees INTEGER DEFAULT 1200,
        availability TEXT,
        status TEXT DEFAULT 'Available' NOT NULL,
        availableDates TEXT,
        deletedAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        phone TEXT NOT NULL,
        concern TEXT NOT NULL,
        status TEXT DEFAULT 'waiting' NOT NULL,
        assignedDoctorId INTEGER,
        deletedAt INTEGER,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT,
        service TEXT NOT NULL,
        preferredDate INTEGER NOT NULL,
        message TEXT,
        status TEXT DEFAULT 'pending' NOT NULL,
        paymentStatus TEXT DEFAULT 'pending' NOT NULL,
        startTime INTEGER,
        endTime INTEGER,
        doctorId INTEGER,
        age INTEGER,
        appointmentNumber INTEGER,
        amountPaid INTEGER,
        amountDue INTEGER,
        deletedAt INTEGER,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        message TEXT NOT NULL,
        deletedAt INTEGER,
        createdAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS prescriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patientId INTEGER NOT NULL,
        doctorId INTEGER NOT NULL,
        diagnosisNotes TEXT NOT NULL,
        pharmacyBillingAmount INTEGER DEFAULT 0 NOT NULL,
        status TEXT DEFAULT 'draft' NOT NULL,
        deletedAt INTEGER,
        createdAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS prescription_medicines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prescriptionId INTEGER NOT NULL,
        medicineName TEXT NOT NULL,
        dosage TEXT NOT NULL,
        frequency TEXT NOT NULL,
        duration TEXT NOT NULL,
        instructions TEXT,
        status TEXT DEFAULT 'pending' NOT NULL,
        deletedAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS prescription_tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prescriptionId INTEGER NOT NULL,
        testName TEXT NOT NULL,
        notes TEXT,
        status TEXT DEFAULT 'pending' NOT NULL,
        deletedAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        appointmentId INTEGER,
        medicineOrderId INTEGER,
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

      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        userName TEXT NOT NULL,
        userRole TEXT NOT NULL,
        action TEXT NOT NULL,
        entity TEXT NOT NULL,
        entityId INTEGER,
        details TEXT,
        createdAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS patient_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patientId INTEGER NOT NULL,
        doctorId INTEGER NOT NULL,
        uploadedById INTEGER NOT NULL,
        reportType TEXT NOT NULL,
        fileUrl TEXT NOT NULL,
        fileName TEXT NOT NULL,
        fileType TEXT NOT NULL,
        status TEXT DEFAULT 'pending' NOT NULL,
        whatsappSentAt INTEGER,
        sentAt INTEGER,
        viewedAt INTEGER,
        notes TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        deletedAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS medicine_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patientId INTEGER NOT NULL,
        items TEXT NOT NULL,
        totalAmount INTEGER NOT NULL,
        paymentStatus TEXT DEFAULT 'pending' NOT NULL,
        deliveryStatus TEXT DEFAULT 'placed' NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        deletedAt INTEGER,
        prescriptionUrl TEXT,
        awbNo TEXT
      );

      -- OCC Tables Manual Fallback
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subdomain TEXT UNIQUE,
        status TEXT DEFAULT 'active' NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tenant_settings (
        id TEXT PRIMARY KEY,
        tenantId TEXT REFERENCES tenants(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        value TEXT,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS feature_flags (
        id TEXT PRIMARY KEY,
        tenantId TEXT REFERENCES tenants(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        enabled INTEGER DEFAULT 0 NOT NULL,
        rolloutPercentage INTEGER DEFAULT 100 NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ops_secrets (
        id TEXT PRIMARY KEY,
        tenantId TEXT REFERENCES tenants(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        referenceKey TEXT NOT NULL,
        status TEXT DEFAULT 'active' NOT NULL,
        lastUpdated INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        channel TEXT NOT NULL,
        status TEXT NOT NULL,
        recipient TEXT,
        payload TEXT,
        createdAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS founder_sessions (
        id TEXT PRIMARY KEY,
        ipAddress TEXT,
        userAgent TEXT,
        startedAt INTEGER NOT NULL,
        endedAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS webhook_logs (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        status TEXT NOT NULL,
        requestId TEXT NOT NULL,
        response TEXT,
        createdAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS background_jobs (
        id TEXT PRIMARY KEY,
        jobType TEXT NOT NULL,
        status TEXT NOT NULL,
        attempts INTEGER DEFAULT 0 NOT NULL,
        lastRun INTEGER
      );

      CREATE TABLE IF NOT EXISTS entity_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entityType TEXT NOT NULL,
        entityId TEXT NOT NULL,
        action TEXT NOT NULL,
        metadata TEXT,
        timestamp INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS system_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS releases (
        id TEXT PRIMARY KEY,
        version TEXT NOT NULL,
        gitCommit TEXT,
        notes TEXT,
        deployedAt INTEGER NOT NULL,
        deployedBy TEXT
      );

      CREATE TABLE IF NOT EXISTS emergency_killswitches (
        key TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        active INTEGER DEFAULT 0 NOT NULL,
        triggeredBy TEXT NOT NULL,
        triggeredAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS integration_registry (
        id TEXT PRIMARY KEY,
        tenantId TEXT REFERENCES tenants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        enabled INTEGER DEFAULT 0 NOT NULL,
        healthStatus TEXT DEFAULT 'unknown' NOT NULL,
        lastSyncAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS backups (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        sizeBytes INTEGER NOT NULL,
        status TEXT NOT NULL,
        storageProvider TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        verifiedAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS error_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        stackTrace TEXT,
        module TEXT NOT NULL,
        status TEXT DEFAULT 'unresolved' NOT NULL,
        timestamp INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenantId TEXT REFERENCES tenants(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        action TEXT NOT NULL,
        module TEXT NOT NULL,
        metadata TEXT,
        timestamp INTEGER NOT NULL
      );
    `);

    // Alter table column additions in case it was created without them
    try {
      sqlite.exec("ALTER TABLE medicine_orders ADD COLUMN prescriptionUrl TEXT;");
    } catch (e) {}
    try {
      sqlite.exec("ALTER TABLE medicine_orders ADD COLUMN awbNo TEXT;");
    } catch (e) {}
    try {
      sqlite.exec("ALTER TABLE appointments ADD COLUMN amountPaid INTEGER;");
    } catch (e) {}
    try {
      sqlite.exec("ALTER TABLE appointments ADD COLUMN amountDue INTEGER;");
    } catch (e) {}
    try {
      sqlite.exec("ALTER TABLE appointments ADD COLUMN address TEXT;");
    } catch (e) {}

    logInfo("Manual database schema fallback applied successfully.");
  } catch (fallbackError) {
    logError("Manual fallback schema creation failed:", fallbackError);
  }
}

// Ensure existing admin user has 'admin' role (since they are the clinic owner)
// and create a separate 'developer' user with the 'founder' role for the developer.
try {
  const fixDb = getDb().$client;
  
  // 1. Downgrade admin to 'admin'
  fixDb.prepare(`UPDATE users SET role = 'admin' WHERE username = 'admin'`).run();
  
  // 2. Ensure developer user exists with 'founder' role
  const devExists = fixDb.prepare("SELECT COUNT(*) as count FROM users WHERE username = 'developer'").get() as { count: number };
  if (devExists.count === 0) {
    const now = Date.now();
    const devPass = process.env.SEED_DEV_PASSWORD || "dev123";
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(devPass, salt, 64).toString("hex");
    const passwordHash = `${salt}:${hash}`;
    
    fixDb.prepare(`
      INSERT INTO users (username, passwordHash, name, role, createdAt, updatedAt, lastSignInAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run("developer", passwordHash, "Developer", "founder", now, now, now);
  }
} catch (e) {
  console.error("Failed to patch developer and admin accounts:", e);
}

// Seed default OCC tables (Tenants, Feature Flags, and Killswitches) safely on every boot
try {
  const occDb = getDb().$client;
  const now = Date.now();

  // 1. Seed default Tenant
  occDb.prepare(`
    INSERT INTO tenants (id, name, subdomain, status, createdAt, updatedAt)
    VALUES ('apollo-aranghata', 'Apollo Information Centre Aranghata', 'capollo', 'active', ?, ?)
    ON CONFLICT(id) DO NOTHING
  `).run(now, now);

  // 2. Seed default Tenant Settings
  const defaultSettings = [
    { key: "clinic_name", value: "Apollo Information Centre Aranghata" },
    { key: "clinic_phone", value: "+917699933383" },
    { key: "timezone", value: "Asia/Kolkata" }
  ];
  for (const setting of defaultSettings) {
    const settingId = `setting_${setting.key}`;
    occDb.prepare(`
      INSERT INTO tenant_settings (id, tenantId, key, value, updatedAt)
      VALUES (?, 'apollo-aranghata', ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).run(settingId, setting.key, setting.value, now);
  }

  // 3. Seed default Feature Flags (Core = enabled, Experimental = disabled)
  const defaultFlags = [
    { key: "appointments", name: "Appointments Management", category: "core", enabled: 1 },
    { key: "billing", name: "Billing & Invoicing", category: "core", enabled: 1 },
    { key: "doctors", name: "Doctors Availability", category: "core", enabled: 1 },
    { key: "whatsapp", name: "WhatsApp Automation", category: "integration", enabled: 0 },
    { key: "diagnostics", name: "Diagnostics Panel", category: "addon", enabled: 0 },
    { key: "online_consultation", name: "Online Consultations", category: "addon", enabled: 0 },
    { key: "ai_receptionist", name: "AI Receptionist", category: "addon", enabled: 0 },
    { key: "reviews", name: "Patient Reviews", category: "addon", enabled: 0 }
  ];
  for (const flag of defaultFlags) {
    const flagId = `flag_${flag.key}`;
    occDb.prepare(`
      INSERT INTO feature_flags (id, tenantId, key, name, category, description, enabled, rolloutPercentage, updatedAt)
      VALUES (?, 'apollo-aranghata', ?, ?, ?, '', ?, 100, ?)
      ON CONFLICT(id) DO NOTHING
    `).run(flagId, flag.key, flag.name, flag.category, flag.enabled, now);
  }

  // 4. Seed default Emergency Killswitches
  const defaultKillswitches = [
    { key: "disable_bookings", name: "Disable Bookings" },
    { key: "disable_payments", name: "Disable Payments" },
    { key: "disable_whatsapp", name: "Disable WhatsApp Send" },
    { key: "disable_doctor_portal", name: "Lock Doctor Portal" },
    { key: "maintenance_mode", name: "Enable Maintenance Mode" }
  ];
  for (const sw of defaultKillswitches) {
    occDb.prepare(`
      INSERT INTO emergency_killswitches (key, name, active, triggeredBy, triggeredAt)
      VALUES (?, ?, 0, 'system', ?)
      ON CONFLICT(key) DO NOTHING
    `).run(sw.key, sw.name, now);
  }

  logInfo("OCC default tenants, feature flags, and killswitches seeded/checked successfully.");
} catch (e) {
  logError("Failed to seed OCC default tables:", e);
}

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
      checkDb.$client.prepare("DELETE FROM patients").run();
    }
  }
} catch {}

// One-time fix: if patients table is empty, seed default patients so they are searchable for uploads
try {
  const checkDb = getDb();
  const patientCount = (checkDb.$client.prepare("SELECT COUNT(*) as count FROM patients").get() as { count: number })?.count ?? 0;
  if (patientCount === 0) {
    const now = Date.now();
    const samplePatients = [
      { name: "Bijoy Sen", age: 45, gender: "Male", phone: "9876543210", concern: "Fever and cough" },
      { name: "Ananya Roy", age: 30, gender: "Female", phone: "9876543211", concern: "Routine checkup" },
      { name: "Rahul Das", age: 12, gender: "Male", phone: "9876543212", concern: "Ear pain" }
    ];
    for (const pat of samplePatients) {
      checkDb.$client.prepare(`
        INSERT INTO patients (name, age, gender, phone, concern, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, 'waiting', ?, ?)
      `).run(pat.name, pat.age, pat.gender, pat.phone, pat.concern, now, now);
    }
    logInfo(`Seed: patched database with ${samplePatients.length} sample patients`);
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
    `).run(seedAdminUser, hashPassword(seedAdminPass), "Apollo Owner (Admin)", "admin", now, now, now);
    console.log(`Seed: created admin user "${seedAdminUser}" (admin role)`);

    const devPass = process.env.SEED_DEV_PASSWORD || "dev123";
    seedDb.prepare(`
      INSERT INTO users (username, passwordHash, name, role, createdAt, updatedAt, lastSignInAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run("developer", hashPassword(devPass), "Developer", "founder", now, now, now);
    console.log("Seed: created developer user (founder role)");

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

    // Seed some default/sample patients to test with
    const samplePatients = [
      { name: "Bijoy Sen", age: 45, gender: "Male", phone: "9876543210", concern: "Fever and cough" },
      { name: "Ananya Roy", age: 30, gender: "Female", phone: "9876543211", concern: "Routine checkup" },
      { name: "Rahul Das", age: 12, gender: "Male", phone: "9876543212", concern: "Ear pain" }
    ];

    for (const pat of samplePatients) {
      seedDb.prepare(`
        INSERT INTO patients (name, age, gender, phone, concern, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, 'waiting', ?, ?)
      `).run(pat.name, pat.age, pat.gender, pat.phone, pat.concern, now, now);
    }
    console.log(`Seed: created ${samplePatients.length} sample patients`);

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
  if (c.req.path === "/api/generate-receipt-pdf") {
    await next();
    return;
  }
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

app.post("/api/generate-receipt-pdf", async (c) => {
  try {
    const body = await c.req.json();
    const { paymentId, amount, phone, patientName, service, date, status } = body;

    if (!paymentId || amount === undefined || !patientName || !service) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const pdfBuffer = await generateReceiptPdf({
      paymentId,
      amount: Number(amount),
      phone: phone || "N/A",
      patientName,
      service,
      date: date || new Date().toLocaleDateString(),
      status: status || undefined,
    });

    c.header("Content-Type", "application/pdf");
    c.header("Content-Disposition", `attachment; filename="receipt-${paymentId}.pdf"`);
    return c.body(new Uint8Array(pdfBuffer));
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "Failed to generate receipt PDF: " + errMsg }, 500);
  }
});

app.get("/api/receipts/pdf", async (c) => {
  try {
    const paymentId = c.req.query("paymentId");
    const amount = c.req.query("amount");
    const phone = c.req.query("phone");
    const patientName = c.req.query("patientName");
    const service = c.req.query("service");
    const date = c.req.query("date");
    const status = c.req.query("status");

    if (!paymentId || !amount || !patientName || !service) {
      return c.text("Missing required fields", 400);
    }

    const pdfBuffer = await generateReceiptPdf({
      paymentId,
      amount: Number(amount),
      phone: phone || "N/A",
      patientName,
      service,
      date: date || new Date().toLocaleDateString(),
      status: status || undefined,
    });

    c.header("Content-Type", "application/pdf");
    c.header("Content-Disposition", `inline; filename="receipt-${paymentId}.pdf"`);
    return c.body(new Uint8Array(pdfBuffer));
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    return c.text("Failed to generate receipt PDF: " + errMsg, 500);
  }
});

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
