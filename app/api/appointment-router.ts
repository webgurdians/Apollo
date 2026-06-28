import { z } from "zod";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { createRouter, publicQuery, staffQuery, clinicStaffQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { appointments, contacts, doctors, bills, patients } from "@db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logActivity } from "./lib/activity";
import { sendWhatsAppPrescription } from "./lib/whatsapp";
type DrizzleDB = BetterSQLite3Database<Record<string, never>>;
type AppointmentRow = {
  id: number;
  preferredDate: Date;
  appointmentNumber: number | null;
  status: string;
  paymentStatus: string;
};

export const createAppointmentInput = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  service: z.string().min(1, "Service is required"),
  preferredDate: z.string().min(1, "Preferred date is required"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  doctorId: z.number().optional(),
  message: z.string().optional(),
  paymentMethod: z.enum(["online", "clinic", "partial"]).optional().default("clinic"),
  age: z.coerce.number().optional(),
  gender: z.string().optional(),
  amountPaid: z.number().optional(),
  amountDue: z.number().optional(),
}).strict();

async function getNextAppointmentNumber(db: DrizzleDB, doctorId: number | null, preferredDate: Date): Promise<number> {
  const startOfDay = new Date(preferredDate);
  startOfDay.setHours(0, 0, 0, 0);

  // Since preferredDate is integer/timestamp or Date, we can fetch all for that doctor and filter in Javascript
  const allForDoc = await db
    .select({
      id: appointments.id,
      preferredDate: appointments.preferredDate,
      appointmentNumber: appointments.appointmentNumber,
      status: appointments.status,
      paymentStatus: appointments.paymentStatus,
    })
    .from(appointments)
    .where(
      and(
        doctorId ? eq(appointments.doctorId, doctorId) : isNull(appointments.doctorId),
        isNull(appointments.deletedAt)
      )
    );

  const targetDateStr = startOfDay.toDateString();
  const dayTokens = allForDoc
    .filter((apt: AppointmentRow) => {
      if (!apt.appointmentNumber) return false;
      const aptDate = new Date(apt.preferredDate);
      return aptDate.toDateString() === targetDateStr;
    })
    .map((apt: AppointmentRow) => apt.appointmentNumber as number);

  if (dayTokens.length === 0) {
    return 1;
  }
  return Math.max(...dayTokens) + 1;
}

async function ensureBillCreated(db: DrizzleDB, appointmentId: number, paymentMethod: "online" | "cash" | "upi") {
  const [apt] = await db
    .select({
      id: appointments.id,
      service: appointments.service,
      doctorId: appointments.doctorId,
      doctorFees: doctors.fees,
    })
    .from(appointments)
    .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!apt) return;

  const servicePrices: Record<string, number> = {
    "OPD Consultation - General Physician": 500,
    "OPD Consultation - Diabetes & Thyroid": 600,
    "OPD Consultation - Cardiology (BP/ECG)": 800,
    "Blood Test / Pathology": 1200,
    "ECG": 300,
    "Urine Test": 150,
    "Ultrasound": 1000,
    "Apollo Chennai Direct Appointment": 1500,
    "Health Checkup Package": 2999,
  };

  const amount = apt.doctorFees ?? servicePrices[apt.service] ?? 500;

  const existing = await db
    .select()
    .from(bills)
    .where(eq(bills.appointmentId, appointmentId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(bills).values({
      appointmentId,
      amount,
      tax: 0,
      discount: 0,
      total: amount,
      status: "paid",
      paymentMethod,
      lockedAt: new Date(),
    });
  } else {
    // If it exists, update the status and payment method, but preserve total, tax, and discount!
    const total = existing[0].total; // keep the existing total calculated by the test
    await db
      .update(bills)
      .set({
        status: "paid",
        paymentMethod,
        lockedAt: new Date(),
        total: total,
      })
      .where(eq(bills.appointmentId, appointmentId));
  }
}

export const appointmentRouter = createRouter({
  create: publicQuery
    .input(createAppointmentInput)
    .mutation(async ({ input }) => {
      const db = getDb();

      // Look up doctor if service matches doctor's serviceName
      let doctorId: number | null = input.doctorId || null;
      if (!doctorId) {
        const foundDoctor = await db
          .select({ id: doctors.id })
          .from(doctors)
          .where(eq(doctors.serviceName, input.service))
          .limit(1);
        if (foundDoctor.length > 0) {
          doctorId = foundDoctor[0].id;
        }
      }

      // Collision detection: check if same doctor + time slot already booked
      if (input.startTime && doctorId) {
        const startDate = new Date(input.startTime);
        const endDate = input.endTime ? new Date(input.endTime) : new Date(startDate.getTime() + 30 * 60000);

        const collisions = await db
          .select()
          .from(appointments)
          .where(
            and(
              eq(appointments.doctorId, doctorId),
              isNull(appointments.deletedAt),
              eq(appointments.status, "confirmed"),
            )
          );

        const hasCollision = collisions.some((apt) => {
          if (!apt.startTime || !apt.endTime) return false;
          const aptStart = new Date(apt.startTime).getTime();
          const aptEnd = new Date(apt.endTime).getTime();
          return startDate.getTime() < aptEnd && endDate.getTime() > aptStart;
        });

        if (hasCollision) {
          throw new TRPCError({ code: "CONFLICT", message: "Slot unavailable. This time is already booked." });
        }
      }

      // Upsert Patient Profile - match by both name and phone
      const existingPatients = await db
        .select()
        .from(patients)
        .where(
          and(
            eq(patients.name, input.name),
            eq(patients.phone, input.phone),
            isNull(patients.deletedAt)
          )
        )
        .limit(1);

      if (existingPatients.length > 0) {
        await db
          .update(patients)
          .set({
            age: input.age !== undefined ? input.age : existingPatients[0].age,
            gender: input.gender || existingPatients[0].gender,
            concern: input.message || existingPatients[0].concern,
            assignedDoctorId: doctorId || existingPatients[0].assignedDoctorId,
            updatedAt: new Date(),
          })
          .where(eq(patients.id, existingPatients[0].id));
      } else {
        await db.insert(patients).values({
          name: input.name,
          age: input.age ?? 30,
          gender: input.gender || "Not Specified",
          phone: input.phone,
          concern: input.message || input.service,
          status: "waiting",
          assignedDoctorId: doctorId,
        });
      }

      const isPaid = input.paymentMethod === "online";
      const isPartial = input.paymentMethod === "partial";
      const preferredDate = new Date(input.preferredDate);
      
      // Calculate token number only if it is paid online
      const appointmentNum = isPaid ? await getNextAppointmentNumber(db, doctorId, preferredDate) : null;

      const [insertedApt] = await db.insert(appointments).values({
        name: input.name,
        phone: input.phone,
        service: input.service,
        preferredDate: preferredDate,
        startTime: input.startTime ? new Date(input.startTime) : null,
        endTime: input.endTime ? new Date(input.endTime) : null,
        doctorId: doctorId,
        age: input.age || null,
        message: input.message || null,
        status: isPaid ? "confirmed" : "pending",
        paymentStatus: isPaid ? "paid" : "pending",
        appointmentNumber: appointmentNum,
        amountPaid: isPartial ? (input.amountPaid || 0) : null,
        amountDue: isPartial ? (input.amountDue || 0) : null,
      }).returning({ id: appointments.id });

      if (isPaid && insertedApt) {
        await ensureBillCreated(db, insertedApt.id, "online");
      } else if (isPartial && insertedApt) {
        // Create a bill with paid status for the paid portion
        const paidAmount = input.amountPaid || 0;
        await db.insert(bills).values({
          appointmentId: insertedApt.id,
          amount: paidAmount,
          tax: 0,
          discount: 0,
          total: paidAmount,
          status: "paid",
          paymentMethod: "cash",
          lockedAt: new Date(),
        });
      }

      // Automatically send a WhatsApp message to the customer with their receipt download link
      try {
        let price = 500;
        if (doctorId) {
          const docRecord = await db.select({ fees: doctors.fees }).from(doctors).where(eq(doctors.id, doctorId)).limit(1);
          if (docRecord.length > 0 && docRecord[0].fees) {
            price = docRecord[0].fees;
          }
        }

        const payId = isPaid ? `pay_${Date.now()}` : `clinic_${Date.now()}`;
        const paymentStatusText = isPaid ? "Paid" : "Pending Payment";
        const formattedDate = preferredDate.toLocaleDateString();

        const receiptUrl = `https://capollo.co.in/api/receipts/pdf?paymentId=${payId}&amount=${price}&phone=${input.phone}&patientName=${encodeURIComponent(input.name)}&service=${encodeURIComponent(input.service)}&date=${encodeURIComponent(formattedDate)}&status=${encodeURIComponent(paymentStatusText)}`;

        const whatsappMsg = `*APOLLO CLINIC PAYMENT RECEIPT*\n\nDear ${input.name},\nThank you for booking your appointment at Apollo Clinic.\n\n*Service:* ${input.service}\n*Date:* ${formattedDate}\n*Amount:* Rs. ${price}\n*Payment Status:* ${paymentStatusText}\n\nYou can view and download your digital payment receipt here:\n${receiptUrl}\n\nThank you for choosing Apollo Clinic!`;

        await sendWhatsAppPrescription(input.phone, whatsappMsg);
      } catch (err) {
        console.error("Failed to send WhatsApp booking receipt:", err);
      }

      return { success: true };
    }),

  list: staffQuery.query(async () => {
    const db = getDb();
    const results = await db
      .select({
        id: appointments.id,
        name: appointments.name,
        phone: appointments.phone,
        service: appointments.service,
        preferredDate: appointments.preferredDate,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        doctorId: appointments.doctorId,
        age: appointments.age,
        message: appointments.message,
        status: appointments.status,
        paymentStatus: appointments.paymentStatus,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        appointmentNumber: appointments.appointmentNumber,
        doctorName: doctors.name,
        doctorFees: doctors.fees,
        amountPaid: appointments.amountPaid,
        amountDue: appointments.amountDue,
      })
      .from(appointments)
      .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
      .where(isNull(appointments.deletedAt))
      .orderBy(desc(appointments.createdAt));
    return results;
  }),

  updateStatus: staffQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db
        .update(appointments)
        .set({ status: input.status })
        .where(eq(appointments.id, input.id));
      await logActivity(ctx.user, "update", "appointment", input.id,
        `Updated status to ${input.status}`);
      return { success: true };
    }),

  updatePaymentStatus: staffQuery
    .input(
      z.object({
        id: z.number(),
        paymentStatus: z.enum(["pending", "paid", "failed"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      
      const [apt] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, input.id))
        .limit(1);

      if (!apt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" });
      }

      const updates: Partial<{ paymentStatus: string; status: string; appointmentNumber: number | null }> = { paymentStatus: input.paymentStatus };

      // If marked as paid, move straight to appointment tab as confirmed and assign token number if not already assigned
      if (input.paymentStatus === "paid") {
        updates.status = "confirmed";
        if (!apt.appointmentNumber) {
          updates.appointmentNumber = await getNextAppointmentNumber(db, apt.doctorId, new Date(apt.preferredDate));
        }
      }

      await db
        .update(appointments)
        .set(updates)
        .where(eq(appointments.id, input.id));

      if (input.paymentStatus === "paid") {
        const existingBill = await db.select().from(bills).where(eq(bills.appointmentId, input.id)).limit(1);
        if (existingBill.length === 0) {
          await ensureBillCreated(db, input.id, "cash"); // default to cash for clinic updates
        } else {
          await db.update(bills).set({ status: "paid" }).where(eq(bills.appointmentId, input.id));
        }
      }

      await logActivity(ctx.user, "payment", "appointment", input.id,
        `Updated payment status to ${input.paymentStatus}`);
      return { success: true };
    }),

  stats: clinicStaffQuery.query(async () => {
    const db = getDb();
    const all = await db
      .select({
        id: appointments.id,
        name: appointments.name,
        phone: appointments.phone,
        service: appointments.service,
        preferredDate: appointments.preferredDate,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        doctorId: appointments.doctorId,
        message: appointments.message,
        status: appointments.status,
        paymentStatus: appointments.paymentStatus,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        doctorFees: doctors.fees,
      })
      .from(appointments)
      .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
      .where(isNull(appointments.deletedAt));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAppointments = all.filter((a) => {
      const d = new Date(a.createdAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });

    // Calculate revenue from bills (includes both appointments and medicine orders)
    const paidBills = await db
      .select({
        total: bills.total,
        status: bills.status,
        createdAt: bills.createdAt,
      })
      .from(bills)
      .where(and(eq(bills.status, "paid"), isNull(bills.deletedAt)));

    const todayRevenue = paidBills
      .filter((b) => {
        const d = new Date(b.createdAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      })
      .reduce((sum, b) => sum + b.total, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthAppointments = all.filter((a) => {
      const d = new Date(a.createdAt);
      return d.getTime() >= monthStart.getTime();
    });

    const monthRevenue = paidBills
      .filter((b) => {
        const d = new Date(b.createdAt);
        return d.getTime() >= monthStart.getTime();
      })
      .reduce((sum, b) => sum + b.total, 0);

    // Count new vs returning patients
    const todayPhones = new Set(todayAppointments.map((a) => a.phone));
    const allPhonesBeforeToday = new Set(
      all
        .filter((a) => new Date(a.createdAt).getTime() < today.getTime())
        .map((a) => a.phone)
    );
    const newPatients = [...todayPhones].filter((p) => !allPhonesBeforeToday.has(p)).length;
    const returningPatients = todayPhones.size - newPatients;

    return {
      total: all.length,
      pending: all.filter((a) => a.status === "pending").length,
      confirmed: all.filter((a) => a.status === "confirmed").length,
      completed: all.filter((a) => a.status === "completed").length,
      today: todayAppointments.length,
      paid: all.filter((a) => a.paymentStatus === "paid").length,
      todayAppointments: todayAppointments.length,
      todayCompleted: todayAppointments.filter((a) => a.status === "completed").length,
      todayPending: todayAppointments.filter((a) => a.status === "pending" || a.status === "confirmed").length,
      todayRevenue,
      monthAppointments: monthAppointments.length,
      monthRevenue,
      newPatients,
      returningPatients,
    };
  }),

  delete: staffQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(appointments).set({ deletedAt: new Date() }).where(eq(appointments.id, input.id));
      await logActivity(ctx.user, "delete", "appointment", input.id, `Soft-deleted appointment #${input.id}`);
      return { success: true };
    }),

  restore: staffQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(appointments).set({ deletedAt: null }).where(eq(appointments.id, input.id));
      await logActivity(ctx.user, "restore", "appointment", input.id);
      return { success: true };
    }),
});

export const contactRouter = createRouter({
  create: publicQuery
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        phone: z.string().min(10, "Valid phone number is required"),
        message: z.string().min(1, "Message is required"),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(contacts).values({
        name: input.name,
        phone: input.phone,
        message: input.message,
      });
      return { success: true };
    }),

  list: staffQuery.query(async () => {
    const db = getDb();
    const results = await db
      .select()
      .from(contacts)
      .where(isNull(contacts.deletedAt))
      .orderBy(desc(contacts.createdAt));
    return results;
  }),

  delete: staffQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(contacts).set({ deletedAt: new Date() }).where(eq(contacts.id, input.id));
      await logActivity(ctx.user, "delete", "contact", input.id);
      return { success: true };
    }),

  restore: staffQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(contacts).set({ deletedAt: null }).where(eq(contacts.id, input.id));
      await logActivity(ctx.user, "restore", "contact", input.id);
      return { success: true };
    }),
});
