import { beforeAll, describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Set environment variables before importing connection/env files
process.env.DATABASE_URL = ":memory:";
process.env.NODE_ENV = "test";
process.env.APP_SECRET = "test-secret-key-for-testing-only";

import { appRouter } from "./router";
import { getDb } from "./queries/connection";
import * as schema from "../db/schema";
import app from "./boot";
import { getPrescriptionSecureToken } from "./lib/pdf";
import { eq } from "drizzle-orm";

describe("TRPC API Router Integration Tests", () => {
  beforeAll(() => {
    const db = getDb();
    const sqlite = db.$client;

    const migrationsDir = path.join(import.meta.dirname, "../db/migrations");
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of migrationFiles) {
      const migrationSql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      const statements = migrationSql.split("--> statement-breakpoint");
      for (const stmt of statements) {
        if (stmt.trim()) {
          try {
            sqlite.exec(stmt);
          } catch (err: unknown) {
            if (
              err instanceof Error &&
              !err.message.includes("already exists") &&
              !err.message.includes("duplicate column")
            ) {
              throw err;
            }
          }
        }
      }
    }

    // Clear existing data to ensure a clean state
    sqlite.exec("DELETE FROM activity_logs;");
    sqlite.exec("DELETE FROM bills;");
    sqlite.exec("DELETE FROM appointments;");
    sqlite.exec("DELETE FROM contacts;");
    sqlite.exec("DELETE FROM prescription_medicines;");
    sqlite.exec("DELETE FROM prescription_tests;");
    sqlite.exec("DELETE FROM prescriptions;");
    sqlite.exec("DELETE FROM patients;");
    sqlite.exec("DELETE FROM doctors;");
    sqlite.exec("DELETE FROM users;");

    // Seed an admin user for authentication testing
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync("adminpassword", salt, 64).toString("hex");
    const passwordHash = `${salt}:${hash}`;

    sqlite.prepare(`
      INSERT INTO users (username, passwordHash, name, role, createdAt, updatedAt, lastSignInAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      "admin",
      passwordHash,
      "Test Admin",
      "admin",
      Date.now(),
      Date.now(),
      Date.now()
    );

    // Seed doctor user
    const docSalt = crypto.randomBytes(16).toString("hex");
    const docHash = crypto.scryptSync("doctorpassword", docSalt, 64).toString("hex");
    const docPasswordHash = `${docSalt}:${docHash}`;

    const docUserResult = sqlite.prepare(`
      INSERT INTO users (username, passwordHash, name, role, createdAt, updatedAt, lastSignInAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      "doctor1",
      docPasswordHash,
      "Doctor User",
      "doctor",
      Date.now(),
      Date.now(),
      Date.now()
    );
    const doctorUserId = docUserResult.lastInsertRowid;

    // Seed doctor profile
    sqlite.prepare(`
      INSERT INTO doctors (name, credentials, specialty, registrationNumber, userId)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      "Doctor Banerjee",
      "MBBS, MD",
      "General Medicine",
      "REG-12345",
      doctorUserId
    );

    // Seed front_desk user for billing tests
    const fdSalt = crypto.randomBytes(16).toString("hex");
    const fdHash = crypto.scryptSync("frontdeskpassword", fdSalt, 64).toString("hex");
    const fdPasswordHash = `${fdSalt}:${fdHash}`;

    sqlite.prepare(`
      INSERT INTO users (username, passwordHash, name, role, createdAt, updatedAt, lastSignInAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      "frontdesk1",
      fdPasswordHash,
      "Front Desk User",
      "front_desk",
      Date.now(),
      Date.now(),
      Date.now()
    );

    // Seed staff user for staff-level tests
    const stSalt = crypto.randomBytes(16).toString("hex");
    const stHash = crypto.scryptSync("staffpassword", stSalt, 64).toString("hex");
    const stPasswordHash = `${stSalt}:${stHash}`;

    sqlite.prepare(`
      INSERT INTO users (username, passwordHash, name, role, createdAt, updatedAt, lastSignInAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      "staff1",
      stPasswordHash,
      "Staff User",
      "staff",
      Date.now(),
      Date.now(),
      Date.now()
    );
  });

  const createMockContext = (user?: schema.User) => {
    return {
      req: new Request("http://localhost/api/trpc"),
      resHeaders: new Headers(),
      user,
    };
  };

  describe("ping", () => {
    it("returns ok and timestamp", async () => {
      const caller = appRouter.createCaller(createMockContext());
      const response = await caller.ping();
      expect(response.ok).toBe(true);
      expect(typeof response.ts).toBe("number");
    });
  });

  describe("auth", () => {
    it("fails login with invalid credentials", async () => {
      const caller = appRouter.createCaller(createMockContext());
      await expect(
        caller.auth.login({ username: "admin", password: "wrongpassword" })
      ).rejects.toThrow("Invalid credentials");
    });

    it("succeeds login with valid credentials", async () => {
      const resHeaders = new Headers();
      const caller = appRouter.createCaller({
        req: new Request("http://localhost/api/trpc"),
        resHeaders,
      });
      const response = await caller.auth.login({
        username: "admin",
        password: "adminpassword",
      });
      expect(response.success).toBe(true);
      expect(resHeaders.get("set-cookie")).toContain("apollo_sid");
      expect(response.role).toBe("admin");
    });

    it("fails creating user if not admin", async () => {
      const regularUser: schema.User = {
        id: 99,
        username: "regularuser",
        passwordHash: "salt:hash",
        name: "Regular User",
        email: "user@example.com",
        avatar: null,
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignInAt: new Date(),
        deletedAt: null,
      };
      const caller = appRouter.createCaller(createMockContext(regularUser));
      await expect(
        caller.auth.createUser({
          username: "staff1",
          password: "staffpassword",
          name: "Staff User",
          role: "staff",
        })
      ).rejects.toThrow("Insufficient permissions");
    });

    it("succeeds creating user if admin", async () => {
      const db = getDb();
      const adminUser = (await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, "admin"))
        .limit(1))[0];

      const caller = appRouter.createCaller(createMockContext(adminUser));
      const response = await caller.auth.createUser({
        username: "staff2",
        password: "staffpassword",
        name: "Staff User 2",
        role: "staff",
      });
      expect(response.success).toBe(true);

      const createdUser = (await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, "staff2"))
        .limit(1))[0];
      expect(createdUser).toBeDefined();
      expect(createdUser.role).toBe("staff");
    });
  });

  describe("appointment", () => {
    it("creates an appointment without authentication", async () => {
      const caller = appRouter.createCaller(createMockContext());
      const response = await caller.appointment.create({
        name: "John Doe",
        phone: "1234567890",
        service: "OPD Consultation - General Physician",
        preferredDate: new Date().toISOString(),
        message: "Feeling unwell",
      });
      expect(response.success).toBe(true);
    });

    it("fails listing appointments if not staff or admin", async () => {
      const caller = appRouter.createCaller(createMockContext());
      await expect(caller.appointment.list()).rejects.toThrow("Authentication required");
    });

    it("succeeds listing appointments for staff", async () => {
      const db = getDb();
      const staffUser = (await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, "staff1"))
        .limit(1))[0];

      const caller = appRouter.createCaller(createMockContext(staffUser));
      const list = await caller.appointment.list();
      expect(list.length).toBeGreaterThanOrEqual(1);
      expect(list[0].name).toBe("John Doe");
    });

    it("updates appointment status", async () => {
      const db = getDb();
      const staffUser = (await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, "staff1"))
        .limit(1))[0];

      const appointments = await db.select().from(schema.appointments).limit(1);
      const targetId = appointments[0].id;

      const caller = appRouter.createCaller(createMockContext(staffUser));
      const updateRes = await caller.appointment.updateStatus({
        id: targetId,
        status: "confirmed",
      });
      expect(updateRes.success).toBe(true);

      const updated = (await db
        .select()
        .from(schema.appointments)
        .where(eq(schema.appointments.id, targetId)))[0];
      expect(updated.status).toBe("confirmed");
    });

    it("updates appointment payment status", async () => {
      const db = getDb();
      const staffUser = (await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, "staff1"))
        .limit(1))[0];

      const appointments = await db.select().from(schema.appointments).limit(1);
      const targetId = appointments[0].id;

      const caller = appRouter.createCaller(createMockContext(staffUser));
      const updateRes = await caller.appointment.updatePaymentStatus({
        id: targetId,
        paymentStatus: "paid",
      });
      expect(updateRes.success).toBe(true);

      const updated = (await db
        .select()
        .from(schema.appointments)
        .where(eq(schema.appointments.id, targetId)))[0];
      expect(updated.paymentStatus).toBe("paid");
    });
  });

  describe("billing", () => {
    it("creates and retrieves a bill for a front_desk user", async () => {
      const db = getDb();
      const fdUser = (await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, "frontdesk1"))
        .limit(1))[0];

      const appointments = await db.select().from(schema.appointments).limit(1);
      const targetAptId = appointments[0].id;

      const caller = appRouter.createCaller(createMockContext(fdUser));
      const billRes = await caller.billing.create({
        appointmentId: targetAptId,
        amount: 500,
        tax: 50,
        discount: 20,
        paymentMethod: "cash",
        status: "paid",
      });
      expect(billRes.success).toBe(true);
      expect(billRes.bill.total).toBe(530);

      const bill = await caller.billing.getByAppointmentId({
        appointmentId: targetAptId,
      });
      expect(bill).not.toBeNull();
      expect(bill?.amount).toBe(500);
      expect(bill?.status).toBe("paid");
    });

    it("lists all bills for a front_desk user", async () => {
      const db = getDb();
      const fdUser = (await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, "frontdesk1"))
        .limit(1))[0];

      const caller = appRouter.createCaller(createMockContext(fdUser));
      const list = await caller.billing.list();
      expect(list.length).toBeGreaterThanOrEqual(1);
      expect(list[0].patientName).toBe("John Doe");
      expect(list[0].amount).toBe(500);
      expect(list[0].total).toBe(530);
    });

    it("prevents staff from accessing billing", async () => {
      const db = getDb();
      const staffUser = (await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, "staff1"))
        .limit(1))[0];

      const caller = appRouter.createCaller(createMockContext(staffUser));
      await expect(caller.billing.list()).rejects.toThrow("Insufficient permissions");
    });
  });

  describe("patients and prescriptions workflow", () => {
    it("manages patient intake, doctor assignment, safety guards, and prescription writing", async () => {
      const db = getDb();
      const adminUser = (await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, "admin"))
        .limit(1))[0];

      const doctorUser = (await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, "doctor1"))
        .limit(1))[0];

      const adminCaller = appRouter.createCaller(createMockContext(adminUser));
      const doctorCaller = appRouter.createCaller(createMockContext(doctorUser));

      // 1. Create Patient
      const createRes = await adminCaller.patients.create({
        name: "Jane Smith",
        age: 28,
        gender: "Female",
        phone: "9876543210",
        concern: "Severe abdominal pain",
      });
      expect(createRes.success).toBe(true);

      // Verify patient in list
      const patientsList = await adminCaller.patients.list();
      expect(patientsList.length).toBe(1);
      expect(patientsList[0].name).toBe("Jane Smith");
      expect(patientsList[0].status).toBe("waiting");

      const patientId = patientsList[0].id;

      // Get Doctors
      const doctorsList = await adminCaller.patients.listDoctors();
      expect(doctorsList.length).toBe(1);
      const doctorId = doctorsList[0].id;

      // 2. Assign Doctor
      const assignRes = await adminCaller.patients.assignDoctor({
        patientId,
        assignedDoctorId: doctorId,
      });
      expect(assignRes.success).toBe(true);

      // Verify assignment in list
      const assignedList = await adminCaller.patients.list({ assignedDoctorId: doctorId });
      expect(assignedList.length).toBe(1);
      expect(assignedList[0].doctorName).toBe("Doctor Banerjee");

      // Update patient status to with_doctor
      const statusRes = await adminCaller.patients.updateStatus({
        id: patientId,
        status: "with_doctor",
      });
      expect(statusRes.success).toBe(true);

      // 3. Test safety guard (cannot reassign when status is with_doctor without force)
      await expect(
        adminCaller.patients.assignDoctor({
          patientId,
          assignedDoctorId: doctorId,
        })
      ).rejects.toThrow("Reassigning might interrupt their consultation");

      // 4. Create Prescription
      const prescriptionRes = await doctorCaller.prescriptions.create({
        patientId,
        diagnosisNotes: "Suspected gastritis",
        medicines: [
          {
            medicineName: "Omeprazole",
            dosage: "20mg",
            frequency: "Once daily before breakfast",
            duration: "14 days",
          },
        ],
        tests: [
          {
            testName: "H. pylori breath test",
            notes: "Fasting required",
          },
        ],
      });
      expect(prescriptionRes.success).toBe(true);
      expect(prescriptionRes.prescriptionId).toBeDefined();

      // Verify patient status is completed now
      const completedPatient = (await db
        .select()
        .from(schema.patients)
        .where(eq(schema.patients.id, patientId)))[0];
      expect(completedPatient.status).toBe("completed");

      // 5. Query prescription details
      const prescriptionData = await adminCaller.prescriptions.getByPatientId({
        patientId,
      });
      expect(prescriptionData).not.toBeNull();
      expect(prescriptionData?.diagnosisNotes).toBe("Suspected gastritis");
      expect(prescriptionData?.medicines.length).toBe(1);
      expect(prescriptionData?.medicines[0].medicineName).toBe("Omeprazole");
      expect(prescriptionData?.tests.length).toBe(1);
      expect(prescriptionData?.tests[0].testName).toBe("H. pylori breath test");
      expect(prescriptionData?.tests[0].status).toBe("pending");

      // 6. Test updates test status
      const testId = prescriptionData!.tests[0].id;
      const updateTestRes = await adminCaller.prescriptions.updateTestStatus({
        id: testId,
        status: "completed",
        notes: "Negative for H. pylori",
      });
      expect(updateTestRes.success).toBe(true);

      const prescriptionDataUpdated = await adminCaller.prescriptions.getByPatientId({
        patientId,
      });
      expect(prescriptionDataUpdated?.tests[0].status).toBe("completed");
      expect(prescriptionDataUpdated?.tests[0].notes).toBe("Negative for H. pylori");

      // 7. Verify listSent displays this prescription
      const sentPrescriptions = await adminCaller.prescriptions.listSent();
      expect(sentPrescriptions.length).toBe(1);
      expect(sentPrescriptions[0].id).toBe(prescriptionRes.prescriptionId);
      expect(sentPrescriptions[0].medicines.length).toBe(1);

      // 8. Update prescription status to dispensed (dispensed by pharmacy)
      const dispenseRes = await adminCaller.prescriptions.updateStatus({
        id: prescriptionRes.prescriptionId!,
        status: "dispensed",
      });
      expect(dispenseRes.success).toBe(true);

      // 9. Verify prescription status in DB is dispensed
      const dispensedPrescription = (await db
        .select()
        .from(schema.prescriptions)
        .where(eq(schema.prescriptions.id, prescriptionRes.prescriptionId!)))[0];
      expect(dispensedPrescription.status).toBe("dispensed");

      // 10. Verify PDF Hono endpoint with secure token validation
      const validToken = getPrescriptionSecureToken(prescriptionRes.prescriptionId!);
      
      const resInvalid = await app.request(`/api/prescriptions/${prescriptionRes.prescriptionId}/pdf?token=invalid_token`);
      expect(resInvalid.status).toBe(403);

      const resValid = await app.request(`/api/prescriptions/${prescriptionRes.prescriptionId}/pdf?token=${validToken}`);
      expect(resValid.status).toBe(200);
      expect(resValid.headers.get("content-type")).toBe("application/pdf");

      // 11. Register new Doctor via createDoctor mutation
      const docRegRes = await adminCaller.patients.createDoctor({
        username: "newdoctor",
        password: "newdocpassword",
        name: "Doctor Sen",
        credentials: "MBBS, MS",
        specialty: "Orthopedics",
        registrationNumber: "REG-99999",
      });
      expect(docRegRes.success).toBe(true);

      const doctorsListUpdated = await adminCaller.patients.listDoctors();
      const newDoc = doctorsListUpdated.find((d) => d.registrationNumber === "REG-99999");
      expect(newDoc).toBeDefined();
      expect(newDoc?.name).toBe("Doctor Sen");
    });
  });

  describe("pharmacy medicine delivery checklist and cumulative payments", () => {
    it("handles partial medicine purchases, tracks cumulative billing amounts, and updates prescription status to dispensed only when fully purchased", async () => {
      const db = getDb();
      const adminUser = (await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, "admin"))
        .limit(1))[0];

      const doctorUser = (await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, "doctor1"))
        .limit(1))[0];

      const adminCaller = appRouter.createCaller(createMockContext(adminUser));
      const doctorCaller = appRouter.createCaller(createMockContext(doctorUser));

      // 1. Create Patient
      const patientRes = await adminCaller.patients.create({
        name: "Alice Smith",
        age: 30,
        gender: "Female",
        phone: "9876543211",
        concern: "Chronic Migraine",
      });
      expect(patientRes.success).toBe(true);

      const patientList = await adminCaller.patients.list();
      const patient = patientList.find(p => p.name === "Alice Smith")!;
      const patientId = patient.id;

      // Assign doctor
      const doctors = await adminCaller.patients.listDoctors();
      const doctorId = doctors[0].id;
      await adminCaller.patients.assignDoctor({ patientId, assignedDoctorId: doctorId });

      // 2. Doctor creates a prescription with 2 medicines
      const prescriptionRes = await doctorCaller.prescriptions.create({
        patientId,
        diagnosisNotes: "Severe migraines",
        medicines: [
          {
            medicineName: "Sumatriptan",
            dosage: "50mg",
            frequency: "As needed",
            duration: "6 days",
          },
          {
            medicineName: "Propranolol",
            dosage: "40mg",
            frequency: "Daily",
            duration: "30 days",
          },
        ],
        tests: [],
      });
      expect(prescriptionRes.success).toBe(true);
      const prescriptionId = prescriptionRes.prescriptionId!;

      // Verify initial prescription status is "sent", billing is 0, and medicines status is pending
      let details = await adminCaller.prescriptions.getByPatientId({ patientId });
      expect(details).not.toBeNull();
      expect(details?.status).toBe("sent");
      expect(details?.pharmacyBillingAmount).toBe(0);
      expect(details?.medicines.length).toBe(2);
      expect(details?.medicines.every(m => m.status === "pending")).toBe(true);

      const med1 = details!.medicines.find(m => m.medicineName === "Sumatriptan")!;
      const med2 = details!.medicines.find(m => m.medicineName === "Propranolol")!;

      // 3. Purchase only the first medicine (Sumatriptan) with ₹350 billing amount
      const dispense1Res = await adminCaller.prescriptions.dispenseMedicines({
        prescriptionId,
        medicineIds: [med1.id],
        billingAmount: 350,
      });
      expect(dispense1Res.success).toBe(true);

      // Verify that:
      // - prescription status remains "sent" (since Propranolol is still pending)
      // - billing amount is exactly ₹350
      // - Sumatriptan status is "purchased", Propranolol status is "pending"
      details = await adminCaller.prescriptions.getByPatientId({ patientId });
      expect(details?.status).toBe("sent");
      expect(details?.pharmacyBillingAmount).toBe(350);
      expect(details?.medicines.find(m => m.id === med1.id)?.status).toBe("purchased");
      expect(details?.medicines.find(m => m.id === med2.id)?.status).toBe("pending");

      // Verify the patient list returns the correct prescription and medicines structure
      const listAfterFirstPurchase = await adminCaller.patients.list();
      const aliceData = listAfterFirstPurchase.find(p => p.id === patientId)!;
      expect(aliceData.prescription).not.toBeNull();
      expect(aliceData.prescription?.status).toBe("sent");
      expect(aliceData.prescription?.pharmacyBillingAmount).toBe(350);

      // 4. Purchase the remaining medicine (Propranolol) with ₹150 billing amount
      const dispense2Res = await adminCaller.prescriptions.dispenseMedicines({
        prescriptionId,
        medicineIds: [med2.id],
        billingAmount: 150,
      });
      expect(dispense2Res.success).toBe(true);

      // Verify that:
      // - prescription status becomes "dispensed" (fully purchased)
      // - billing amount accumulates to ₹500 (350 + 150)
      // - Both medicines have status "purchased"
      details = await adminCaller.prescriptions.getByPatientId({ patientId });
      expect(details?.status).toBe("dispensed");
      expect(details?.pharmacyBillingAmount).toBe(500);
      expect(details?.medicines.every(m => m.status === "purchased")).toBe(true);

      // Verify patient list updates accordingly
      const listAfterSecondPurchase = await adminCaller.patients.list();
      const aliceDataFinal = listAfterSecondPurchase.find(p => p.id === patientId)!;
      expect(aliceDataFinal.prescription?.status).toBe("dispensed");
      expect(aliceDataFinal.prescription?.pharmacyBillingAmount).toBe(500);
    });
  });
});
