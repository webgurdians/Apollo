import { z } from "zod";
import { createRouter, publicQuery, billingQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { bills, appointments } from "@db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logActivity } from "./lib/activity";

export const billingRouter = createRouter({
  list: billingQuery.query(async () => {
    const db = getDb();
    const results = await db
      .select({
        id: bills.id,
        appointmentId: bills.appointmentId,
        amount: bills.amount,
        tax: bills.tax,
        discount: bills.discount,
        total: bills.total,
        status: bills.status,
        paymentMethod: bills.paymentMethod,
        correctionNote: bills.correctionNote,
        lockedAt: bills.lockedAt,
        createdAt: bills.createdAt,
        updatedAt: bills.updatedAt,
        patientName: appointments.name,
        patientPhone: appointments.phone,
        service: appointments.service,
      })
      .from(bills)
      .innerJoin(appointments, eq(bills.appointmentId, appointments.id))
      .where(isNull(bills.deletedAt))
      .orderBy(desc(bills.createdAt));
    return results;
  }),

  create: billingQuery
    .input(
      z.object({
        appointmentId: z.number(),
        amount: z.number().min(0),
        tax: z.number().min(0).default(0),
        discount: z.number().min(0).default(0),
        paymentMethod: z.enum(["online", "cash", "upi"]).optional(),
        status: z.enum(["unpaid", "paid"]).default("unpaid"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const apts = await db.select().from(appointments).where(eq(appointments.id, input.appointmentId));
      if (!apts.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" });
      }

      const existing = await db.select().from(bills).where(eq(bills.appointmentId, input.appointmentId));
      if (existing.length > 0) {
        // Instead of throwing a conflict, let's delete the existing automated bill to write the custom one, or update it
        await db.delete(bills).where(eq(bills.appointmentId, input.appointmentId));
      }

      const total = input.amount + input.tax - input.discount;

      const [newBill] = await db.insert(bills).values({
        appointmentId: input.appointmentId,
        amount: input.amount,
        tax: input.tax,
        discount: input.discount,
        total: total,
        paymentMethod: input.paymentMethod || null,
        status: input.status,
        lockedAt: input.status === "paid" ? new Date() : null,
      }).returning();

      await logActivity(ctx.user, "create", "bill", newBill.id,
        `Created bill for appointment #${input.appointmentId}: ₹${total}`);

      return { success: true, bill: newBill };
    }),

  getByAppointmentId: publicQuery
    .input(z.object({ appointmentId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const results = await db.select().from(bills)
        .where(and(eq(bills.appointmentId, input.appointmentId), isNull(bills.deletedAt)));
      return results[0] || null;
    }),

  updateStatus: billingQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["unpaid", "paid"]),
        paymentMethod: z.enum(["online", "cash", "upi"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const [existing] = await db.select().from(bills).where(eq(bills.id, input.id)).limit(1);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bill not found" });
      }

      if (existing.lockedAt && existing.status === "paid") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot edit a paid bill. Use refund or correction note instead." });
      }

      await db
        .update(bills)
        .set({
          status: input.status,
          paymentMethod: input.paymentMethod || null,
          lockedAt: input.status === "paid" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(bills.id, input.id));

      await logActivity(ctx.user, "update", "bill", input.id,
        `Updated bill status to ${input.status}`);

      return { success: true };
    }),

  refund: billingQuery
    .input(z.object({
      id: z.number(),
      correctionNote: z.string().min(1, "Refund reason is required"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const [existing] = await db.select().from(bills).where(eq(bills.id, input.id)).limit(1);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bill not found" });
      }
      if (existing.status !== "paid") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Can only refund a paid bill" });
      }

      await db
        .update(bills)
        .set({
          status: "refunded",
          correctionNote: input.correctionNote,
          updatedAt: new Date(),
        })
        .where(eq(bills.id, input.id));

      await logActivity(ctx.user, "refund", "bill", input.id,
        `Refunded bill #${input.id}: ${input.correctionNote}`);

      return { success: true };
    }),

  addCorrectionNote: billingQuery
    .input(z.object({
      id: z.number(),
      note: z.string().min(1, "Correction note is required"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [existing] = await db.select().from(bills).where(eq(bills.id, input.id)).limit(1);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bill not found" });
      }

      const prevNote = existing.correctionNote || "";
      const newNote = prevNote ? `${prevNote}\n---\n${input.note}` : input.note;

      await db
        .update(bills)
        .set({ correctionNote: newNote, updatedAt: new Date() })
        .where(eq(bills.id, input.id));

      await logActivity(ctx.user, "update", "bill", input.id,
        `Added correction note to bill #${input.id}: ${input.note}`);

      return { success: true };
    }),

  softDelete: billingQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [existing] = await db.select().from(bills).where(eq(bills.id, input.id)).limit(1);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bill not found" });
      }
      await db.update(bills).set({ deletedAt: new Date() }).where(eq(bills.id, input.id));
      await logActivity(ctx.user, "delete", "bill", input.id, `Soft-deleted bill #${input.id}`);
      return { success: true };
    }),

  restore: billingQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(bills).set({ deletedAt: null }).where(eq(bills.id, input.id));
      await logActivity(ctx.user, "restore", "bill", input.id);
      return { success: true };
    }),
});
