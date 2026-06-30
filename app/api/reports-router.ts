import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createRouter, frontDeskQuery, clinicStaffQuery, authedQuery } from "./middleware";
import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import { patientReports, patients, doctors, users, appointments, medicineOrders, billingTransactions } from "../db/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { logActivity } from "./lib/activity";

const s3Client = new S3Client({
  region: env.s3Region,
  endpoint: env.s3PublicUrl ? undefined : undefined,
  credentials: {
    accessKeyId: env.s3AccessKeyId,
    secretAccessKey: env.s3SecretAccessKey,
  },
});

export const reportsRouter = createRouter({
  getUploadUrl: frontDeskQuery
    .input(z.object({
      fileName: z.string().min(1),
      fileType: z.string().min(1),
      patientId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const key = `reports/${input.patientId}/${Date.now()}-${input.fileName}`;
      const command = new PutObjectCommand({
        Bucket: env.s3Bucket,
        Key: key,
        ContentType: input.fileType,
      });
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
      const fileUrl = `${env.s3PublicUrl}/${key}`;
      return { uploadUrl, fileUrl, key };
    }),

  create: frontDeskQuery
    .input(z.object({
      patientId: z.number(),
      doctorId: z.number(),
      reportType: z.string().min(1),
      fileUrl: z.string(),
      fileName: z.string().min(1),
      fileType: z.string().min(1),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [report] = await db.insert(patientReports).values({
        patientId: input.patientId,
        doctorId: input.doctorId,
        uploadedById: ctx.user!.id,
        reportType: input.reportType,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        fileType: input.fileType,
        notes: input.notes || null,
      }).returning();
      await logActivity(ctx.user!, "upload", "patientReport", report.id, `Uploaded ${input.reportType} report for patient #${input.patientId}`);
      return report;
    }),

  list: clinicStaffQuery
    .input(z.object({
      patientId: z.number().optional(),
      status: z.enum(["pending", "to_be_sent", "sent", "viewed"]).optional(),
      doctorId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [isNull(patientReports.deletedAt)];
      if (input?.patientId) conditions.push(eq(patientReports.patientId, input.patientId));
      if (input?.status) conditions.push(eq(patientReports.status, input.status));
      if (input?.doctorId) conditions.push(eq(patientReports.doctorId, input.doctorId));
      return db.select({
        id: patientReports.id,
        patientId: patientReports.patientId,
        doctorId: patientReports.doctorId,
        uploadedById: patientReports.uploadedById,
        reportType: patientReports.reportType,
        fileUrl: patientReports.fileUrl,
        fileName: patientReports.fileName,
        fileType: patientReports.fileType,
        status: patientReports.status,
        whatsappSentAt: patientReports.whatsappSentAt,
        sentAt: patientReports.sentAt,
        viewedAt: patientReports.viewedAt,
        notes: patientReports.notes,
        createdAt: patientReports.createdAt,
        updatedAt: patientReports.updatedAt,
        patientName: patients.name,
        patientPhone: patients.phone,
        doctorName: doctors.name,
        doctorSpecialty: doctors.specialty,
        uploadedByName: users.name,
      })
        .from(patientReports)
        .innerJoin(patients, eq(patientReports.patientId, patients.id))
        .innerJoin(doctors, eq(patientReports.doctorId, doctors.id))
        .innerJoin(users, eq(patientReports.uploadedById, users.id))
        .where(and(...conditions))
        .orderBy(desc(patientReports.createdAt));
    }),

  updateStatus: frontDeskQuery
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "to_be_sent", "sent", "viewed"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const updateData: Record<string, unknown> = { status: input.status };
      if (input.status === "sent") {
        updateData.sentAt = new Date();
        updateData.whatsappSentAt = new Date();
      }
      const [report] = await db.update(patientReports)
        .set(updateData)
        .where(eq(patientReports.id, input.id))
        .returning();
      await logActivity(ctx.user!, "update", "patientReport", input.id, `Status changed to ${input.status}`);
      return report;
    }),

  markViewed: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [report] = await db.select().from(patientReports).where(eq(patientReports.id, input.id)).limit(1);
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      const doctor = await db.select().from(doctors).where(eq(doctors.userId, ctx.user!.id)).limit(1);
      if (!doctor.length || doctor[0].id !== report.doctorId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This report is not assigned to you" });
      }
      const [updated] = await db.update(patientReports)
        .set({ status: "viewed", viewedAt: new Date() })
        .where(eq(patientReports.id, input.id))
        .returning();
      await logActivity(ctx.user!, "view", "patientReport", input.id, "Doctor marked report as viewed");
      return updated;
    }),

  listForDoctor: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const doctor = await db.select().from(doctors).where(eq(doctors.userId, ctx.user!.id)).limit(1);
    if (!doctor.length) throw new TRPCError({ code: "FORBIDDEN", message: "No doctor profile found" });
    return db.select({
      id: patientReports.id,
      patientId: patientReports.patientId,
      doctorId: patientReports.doctorId,
      reportType: patientReports.reportType,
      fileUrl: patientReports.fileUrl,
      fileName: patientReports.fileName,
      fileType: patientReports.fileType,
      status: patientReports.status,
      sentAt: patientReports.sentAt,
      viewedAt: patientReports.viewedAt,
      notes: patientReports.notes,
      createdAt: patientReports.createdAt,
      patientName: patients.name,
      patientPhone: patients.phone,
    })
      .from(patientReports)
      .innerJoin(patients, eq(patientReports.patientId, patients.id))
      .where(and(
        eq(patientReports.doctorId, doctor[0].id),
        isNull(patientReports.deletedAt),
      ))
      .orderBy(desc(patientReports.createdAt));
  }),

  getFinancialSummary: clinicStaffQuery.query(async () => {
    const db = getDb();
    const now = new Date();
    
    // Start dates
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Helper to calculate totals
    const getStats = async (startDate: Date) => {
      // 1. Appointments Count
      const apts = await db.select()
        .from(appointments)
        .where(
          and(
            isNull(appointments.deletedAt),
            sql`created_at >= ${startDate.getTime()}`
          )
        )
        .all();

      // 2. Medicine Orders Count
      const orders = await db.select()
        .from(medicineOrders)
        .where(
          and(
            isNull(medicineOrders.deletedAt),
            sql`createdAt >= ${startDate.getTime()}`
          )
        )
        .all();

      // 3. Transactions Count and Revenue sum
      const txs = await db.select()
        .from(billingTransactions)
        .where(
          and(
            eq(billingTransactions.status, "paid"),
            sql`created_at >= ${startDate.getTime()}`
          )
        )
        .all();

      const walkins = apts.filter(a => a.appointmentNumber === null).length;
      const apptCount = apts.length - walkins;
      const totalRevenue = txs.reduce((sum, t) => sum + t.amount, 0);

      return {
        revenue: totalRevenue,
        appointments: apptCount,
        walkins,
        medicineOrders: orders.length,
        patientCount: apts.length + orders.length,
      };
    };

    const todayStats = await getStats(startOfToday);
    const weekStats = await getStats(startOfWeek);
    const monthStats = await getStats(startOfMonth);

    // Daily revenue trends (last 7 days)
    const dailyTrends: { date: string; revenue: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const startD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const endD = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

      const dayTxs = await db.select()
        .from(billingTransactions)
        .where(
          and(
            eq(billingTransactions.status, "paid"),
            sql`created_at >= ${startD.getTime()}`,
            sql`created_at < ${endD.getTime()}`
          )
        )
        .all();

      dailyTrends.push({
        date: d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
        revenue: dayTxs.reduce((sum, t) => sum + t.amount, 0),
        count: dayTxs.length,
      });
    }

    return {
      today: todayStats,
      weekly: weekStats,
      monthly: monthStats,
      dailyTrends,
    };
  }),
});
