import { z } from "zod";
import { createRouter, publicQuery, staffQuery, clinicStaffQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { appointments, contacts, doctors, bills, patients } from "@db/schema";
import { eq, desc, and, isNull, inArray, isNotNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logActivity } from "./lib/activity";

export const createAppointmentInput = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  service: z.string().min(1, "Service is required"),
  preferredDate: z.string().min(1, "Preferred date is required"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  doctorId: z.number().optional(),
  message: z.string().optional(),
  paymentMethod: z.enum(["online", "clinic"]).optional().default("clinic"),
  age: z.coerce.number().optional(),
  gender: z.string().optional(),
}).strict();

async function getNextAppointmentNumber(db: any, doctorId: number | null, preferredDate: Date): Promise<number> {
  const startOfDay = new Date(preferredDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(preferredDate);
  endOfDay.setHours(23, 59, 59, 999);

  const existing = await db
    .select({ appointmentNumber: appointments.appointmentNumber })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, doctorId || 0),
        isNull(appointments.deletedAt),
        inArray(appointments.status, ["confirmed", "completed"]),
        isNotNull(appointments.appointmentNumber)
      )
    );

  // We filter in memory for preferredDate day match to handle timestamp conversions correctly
  const sameDayAppointments = existing.filter((apt: any) => {
    // If you need exact day matching
    return true; // We will do date comparison inside query or filtered
  });

  const query = await db
    .select({ appointmentNumber: appointments.appointmentNumber })
    .from(appointments)
    .where(
      and(
        doctorId ? eq(appointments.doctorId, doctorId) : isNull(appointments.doctorId),
        isNull(appointments.deletedAt)
      )
    );

  const matched = query.filter((a: any) => {
    if (!a.appointmentNumber) return false;
    // Check if preferredDate matches the same calendar day
    const aptDate = new Date(preferredDate);
    const dbDate = new Date(preferredDate); // placeholder, let's look at the appointment's preferredDate
    return true; 
  });

  // Let's implement a robust day filtering query
  const dayStart = new Date(preferredDate);
  dayStart.setHours(0,0,0,0);
  const dayEnd = new Date(preferredDate);
  dayEnd.setHours(23,59,59,999);

  // Filter correctly by checking if preferredDate is within the start/end of the day
  const dailyConfirmed = await db
    .select({ appointmentNumber: appointments.appointmentNumber })
    .from(appointments)
    .where(
      and(
        doctorId ? eq(appointments.doctorId, doctorId) : isNull(appointments.doctorId),
        isNull(appointments.deletedAt)
      )
    );

  const filtered = dailyConfirmed.filter((apt: any) => {
    if (!apt.appointmentNumber) return false;
    // Find appointments scheduled for the same calendar date
    // We should compare preferredDate in DB (which is stored as Date or timestamp)
    return true; // we will fetch all and compare below
  });

  // Let's write the query accurately:
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
    .filter((apt: any) => {
      if (!apt.appointmentNumber) return false;
      const aptDate = new Date(apt.preferredDate);
      return aptDate.toDateString() === targetDateStr;
    })
    .map((apt: any) => apt.appointmentNumber as number);

  if (dayTokens.length === 0) {
    return 1;
  }
  return Math.max(...dayTokens) + 1;
}

async function ensureBillCreated(db: any, appointmentId: number, paymentMethod: "online" | "cash" | "upi") {
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
    "X-Ray": 500,
    "Urine Test": 150,
    "Ultrasound": 1000,
    "Apollo Chennai Referral": 1500,
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
    await db
      .update(bills)
      .set({
        status: "paid",
        paymentMethod,
        lockedAt: new Date(),
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
      }).returning({ id: appointments.id });

      if (isPaid && insertedApt) {
        await ensureBillCreated(db, insertedApt.id, "online");
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

      const updates: any = { paymentStatus: input.paymentStatus };

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
        await ensureBillCreated(db, input.id, "cash"); // default to cash for clinic updates
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

    const servicePrices: Record<string, number> = {
      "OPD Consultation - General Physician": 500,
      "OPD Consultation - Diabetes & Thyroid": 600,
      "OPD Consultation - Cardiology (BP/ECG)": 800,
      "Blood Test / Pathology": 1200,
      "ECG": 300,
      "X-Ray": 500,
      "Urine Test": 150,
      "Ultrasound": 1000,
      "Apollo Chennai Referral": 1500,
      "Health Checkup Package": 2999,
    };

    const getPrice = (a: { service: string; doctorFees: number | null }) => {
      return a.doctorFees ?? servicePrices[a.service] ?? 500;
    };

    const todayAppointments = all.filter((a) => {
      const d = new Date(a.createdAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });

    const todayRevenue = todayAppointments
      .filter((a) => a.paymentStatus === "paid")
      .reduce((sum, a) => sum + getPrice(a), 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthAppointments = all.filter((a) => {
      const d = new Date(a.createdAt);
      return d.getTime() >= monthStart.getTime();
    });

    const monthRevenue = monthAppointments
      .filter((a) => a.paymentStatus === "paid")
      .reduce((sum, a) => sum + getPrice(a), 0);

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
