import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { validateRequestOrigin } from "./lib/origin";
import { getPrescriptionSecureToken, generatePrescriptionPdf } from "./lib/pdf";
import { getDb } from "./queries/connection";
import {
  prescriptions,
  patients,
  doctors,
  prescriptionMedicines,
  prescriptionTests,
} from "../db/schema";
import { eq } from "drizzle-orm";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

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

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
