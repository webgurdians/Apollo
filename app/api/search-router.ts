import { z } from "zod";
import { createRouter, staffQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { patients, appointments, bills, doctors } from "@db/schema";
import { eq, like, or, isNull, and, desc, sql } from "drizzle-orm";

export const searchRouter = createRouter({
  global: staffQuery
    .input(z.object({ q: z.string().min(1).max(100) }))
    .query(async ({ input }) => {
      const db = getDb();
      const term = `%${input.q}%`;
      const results: {
        patients: Record<string, unknown>[];
        appointments: Record<string, unknown>[];
        bills: Record<string, unknown>[];
        doctors: Record<string, unknown>[];
      } = {
        patients: [],
        appointments: [],
        bills: [],
        doctors: [],
      };

      // Search patients by name or phone
      results.patients = await db
        .select({
          id: patients.id,
          name: patients.name,
          phone: patients.phone,
          age: patients.age,
          gender: patients.gender,
          concern: patients.concern,
          status: patients.status,
          createdAt: patients.createdAt,
          _type: sql<string>`'patient'`.as("_type"),
        })
        .from(patients)
        .where(and(
          isNull(patients.deletedAt),
          or(
            like(patients.name, term),
            like(patients.phone, term),
          ),
        ))
        .orderBy(desc(patients.createdAt))
        .limit(10);

      // Search appointments by name, phone, or service
      results.appointments = await db
        .select({
          id: appointments.id,
          name: appointments.name,
          phone: appointments.phone,
          service: appointments.service,
          preferredDate: appointments.preferredDate,
          status: appointments.status,
          createdAt: appointments.createdAt,
          _type: sql<string>`'appointment'`.as("_type"),
        })
        .from(appointments)
        .where(and(
          isNull(appointments.deletedAt),
          or(
            like(appointments.name, term),
            like(appointments.phone, term),
            like(appointments.service, term),
          ),
        ))
        .orderBy(desc(appointments.createdAt))
        .limit(10);

      // Search bills by patient name via join
      const billResults = await db
        .select({
          id: bills.id,
          appointmentId: bills.appointmentId,
          amount: bills.amount,
          total: bills.total,
          status: bills.status,
          createdAt: bills.createdAt,
          patientName: appointments.name,
          patientPhone: appointments.phone,
          _type: sql<string>`'bill'`.as("_type"),
        })
        .from(bills)
        .innerJoin(appointments, eq(bills.appointmentId, appointments.id))
        .where(and(
          isNull(bills.deletedAt),
          or(
            like(appointments.name, term),
            like(appointments.phone, term),
            sql`CAST(${bills.id} AS TEXT) LIKE ${term}`,
          ),
        ))
        .orderBy(desc(bills.createdAt))
        .limit(10);
      results.bills = billResults;

      // Search doctors by name or specialty
      results.doctors = await db
        .select({
          id: doctors.id,
          name: doctors.name,
          specialty: doctors.specialty,
          credentials: doctors.credentials,
          _type: sql<string>`'doctor'`.as("_type"),
        })
        .from(doctors)
        .where(and(
          isNull(doctors.deletedAt),
          or(
            like(doctors.name, term),
            like(doctors.specialty, term),
          ),
        ))
        .limit(10);

      return results;
    }),
});
