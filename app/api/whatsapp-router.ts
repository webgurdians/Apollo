import { z } from "zod";
import { createRouter, founderQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  whatsappSettings,
  whatsappTemplates,
  whatsappMessages,
  whatsappCampaigns,
  whatsappCampaignRecipients,
  patientPreferences,
  patients,
  whatsappAuditLogs,
  appointments,
  medicineOrders
} from "@db/schema";
import { eq, and, isNull, desc, count, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { encrypt, decrypt } from "./lib/crypto";

// Helper to validate Meta token credentials
async function validateMetaCredentials(token: string, phoneId: string): Promise<boolean> {
  try {
    const url = `https://graph.facebook.com/v19.0/${phoneId}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.ok;
  } catch (e) {
    return false;
  }
}

export const whatsappRouter = createRouter({
  getSettings: founderQuery.query(async ({ ctx }) => {
    const db = getDb();
    const settings = await db.select().from(whatsappSettings).where(eq(whatsappSettings.tenantId, ctx.tenantId)).get();
    if (!settings) {
      return {
        metaAccessTokenEncrypted: "",
        phoneNumberId: "",
        businessAccountId: "",
        webhookStatus: "inactive",
      };
    }
    return {
      phoneNumberId: settings.phoneNumberId || "",
      businessAccountId: settings.businessAccountId || "",
      webhookStatus: settings.webhookStatus,
      hasToken: !!settings.metaAccessTokenEncrypted,
    };
  }),

  saveSettings: founderQuery
    .input(
      z.object({
        metaAccessToken: z.string().min(1),
        phoneNumberId: z.string().min(1),
        businessAccountId: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Validate credentials with Meta Graph API
      const isValid = await validateMetaCredentials(input.metaAccessToken, input.phoneNumberId);
      if (!isValid) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Invalid Meta credentials. Connection test failed.",
        });
      }

      const encryptedToken = encrypt(input.metaAccessToken);
      const existing = await db.select().from(whatsappSettings).where(eq(whatsappSettings.tenantId, ctx.tenantId)).get();

      if (existing) {
        await db.update(whatsappSettings)
          .set({
            metaAccessTokenEncrypted: encryptedToken,
            phoneNumberId: input.phoneNumberId,
            businessAccountId: input.businessAccountId,
            webhookStatus: "active",
            updatedAt: new Date(),
          })
          .where(eq(whatsappSettings.id, existing.id));
      } else {
        await db.insert(whatsappSettings).values({
          tenantId: ctx.tenantId,
          metaAccessTokenEncrypted: encryptedToken,
          phoneNumberId: input.phoneNumberId,
          businessAccountId: input.businessAccountId,
          webhookStatus: "active",
        });
      }

      return { success: true };
    }),

  listTemplates: founderQuery.query(async ({ ctx }) => {
    const db = getDb();
    return await db.select()
      .from(whatsappTemplates)
      .where(and(isNull(whatsappTemplates.deletedAt), eq(whatsappTemplates.tenantId, ctx.tenantId)))
      .orderBy(desc(whatsappTemplates.createdAt))
      .all();
  }),

  createTemplate: founderQuery
    .input(
      z.object({
        name: z.string().min(1),
        category: z.enum(["utility", "marketing", "authentication"]),
        templateKey: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Version calculation
      const existing = await db.select()
        .from(whatsappTemplates)
        .where(
          and(
            eq(whatsappTemplates.templateKey, input.templateKey),
            eq(whatsappTemplates.tenantId, ctx.tenantId),
            isNull(whatsappTemplates.deletedAt)
          )
        )
        .all();

      const latestVersion = existing.reduce((max, t) => Math.max(max, t.version), 0);
      const nextVersion = latestVersion + 1;

      // Deactivate older templates of the same key
      await db.update(whatsappTemplates)
        .set({ isActive: 0 })
        .where(
          and(
            eq(whatsappTemplates.templateKey, input.templateKey),
            eq(whatsappTemplates.tenantId, ctx.tenantId)
          )
        );

      const [newTpl] = await db.insert(whatsappTemplates).values({
        tenantId: ctx.tenantId,
        name: input.name,
        category: input.category,
        templateKey: input.templateKey,
        status: "approved", // Automatically approve in mock system
        version: nextVersion,
        isActive: 1,
      }).returning({ id: whatsappTemplates.id });

      // Audit Log
      await db.insert(whatsappAuditLogs).values({
        tenantId: ctx.tenantId,
        userId: ctx.user.id,
        action: "template_modified",
        targetId: newTpl.id,
        details: `Created template version ${nextVersion} for ${input.templateKey}`,
      });

      return { success: true };
    }),

  deleteTemplate: founderQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(whatsappTemplates)
        .set({ deletedAt: new Date(), isActive: 0 })
        .where(eq(whatsappTemplates.id, input.id));

      await db.insert(whatsappAuditLogs).values({
        tenantId: ctx.tenantId,
        userId: ctx.user.id,
        action: "template_modified",
        targetId: input.id,
        details: `Deleted template ID ${input.id}`,
      });

      return { success: true };
    }),

  toggleTemplateActive: founderQuery
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const target = await db.select().from(whatsappTemplates).where(eq(whatsappTemplates.id, input.id)).get();
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });

      if (input.isActive) {
        // Deactivate siblings first
        await db.update(whatsappTemplates)
          .set({ isActive: 0 })
          .where(
            and(
              eq(whatsappTemplates.templateKey, target.templateKey),
              eq(whatsappTemplates.tenantId, ctx.tenantId)
            )
          );
      }

      await db.update(whatsappTemplates)
        .set({ isActive: input.isActive ? 1 : 0 })
        .where(eq(whatsappTemplates.id, input.id));

      return { success: true };
    }),

  listMessages: founderQuery
    .input(
      z.object({
        patientId: z.number().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = getDb();
      let query = db.select({
        id: whatsappMessages.id,
        patientName: patients.name,
        patientPhone: patients.phone,
        messageType: whatsappMessages.messageType,
        status: whatsappMessages.status,
        providerMessageId: whatsappMessages.providerMessageId,
        errorMessage: whatsappMessages.errorMessage,
        sentAt: whatsappMessages.sentAt,
      })
      .from(whatsappMessages)
      .leftJoin(patients, eq(whatsappMessages.patientId, patients.id))
      .where(eq(whatsappMessages.tenantId, ctx.tenantId));

      if (input.patientId) {
        query = query.where(and(eq(whatsappMessages.patientId, input.patientId), eq(whatsappMessages.tenantId, ctx.tenantId))) as any;
      }

      return await query
        .orderBy(desc(whatsappMessages.sentAt))
        .limit(input.limit)
        .offset(input.offset)
        .all();
    }),

  listCampaigns: founderQuery.query(async ({ ctx }) => {
    const db = getDb();
    return await db.select()
      .from(whatsappCampaigns)
      .where(and(isNull(whatsappCampaigns.deletedAt), eq(whatsappCampaigns.tenantId, ctx.tenantId)))
      .orderBy(desc(whatsappCampaigns.scheduledAt))
      .all();
  }),

  createCampaign: founderQuery
    .input(
      z.object({
        name: z.string().min(1),
        templateId: z.number(),
        segmentType: z.enum(["all_patients", "recent_patients", "returning_patients", "followup_due", "medicine_customers"]),
        scheduledAt: z.string().optional(), // ISO String
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Resolve patients matching this segment
      let targetPatients: any[] = [];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      if (input.segmentType === "all_patients") {
        targetPatients = await db.select().from(patients).where(and(isNull(patients.deletedAt), eq(patients.tenantId, ctx.tenantId))).all();
      } else if (input.segmentType === "recent_patients") {
        targetPatients = await db.select()
          .from(patients)
          .where(
            and(
              isNull(patients.deletedAt),
              eq(patients.tenantId, ctx.tenantId),
              sql`created_at >= ${thirtyDaysAgo.getTime()}`
            )
          )
          .all();
      } else if (input.segmentType === "returning_patients") {
        // Patients with > 1 appointment
        const counts = await db.select({
          phone: appointments.phone,
          c: count()
        })
        .from(appointments)
        .where(eq(appointments.tenantId, ctx.tenantId))
        .groupBy(appointments.phone)
        .all();

        const returningPhones = counts.filter(x => x.c > 1).map(x => x.phone);
        if (returningPhones.length > 0) {
          targetPatients = await db.select()
            .from(patients)
            .where(
              and(
                isNull(patients.deletedAt),
                eq(patients.tenantId, ctx.tenantId),
                sql`phone IN (${returningPhones.join(",")})`
              )
            )
            .all();
        }
      } else if (input.segmentType === "followup_due") {
        targetPatients = await db.select()
          .from(patients)
          .where(
            and(
              isNull(patients.deletedAt),
              eq(patients.tenantId, ctx.tenantId),
              eq(patients.status, "waiting")
            )
          )
          .all();
      } else if (input.segmentType === "medicine_customers") {
        const meds = await db.select({ patientId: medicineOrders.patientId }).from(medicineOrders).all();
        const medIds = [...new Set(meds.map(x => x.patientId))];
        if (medIds.length > 0) {
          targetPatients = await db.select()
            .from(patients)
            .where(
              and(
                isNull(patients.deletedAt),
                eq(patients.tenantId, ctx.tenantId),
                sql`id IN (${medIds.join(",")})`
              )
            )
            .all();
        }
      }

      // Check consent on each before scheduling
      const consentedIds: number[] = [];
      for (const p of targetPatients) {
        const pref = await db.select().from(patientPreferences).where(eq(patientPreferences.patientId, p.id)).get();
        if (!pref || (pref.whatsappOptIn === 1 && pref.marketingOptIn === 1)) {
          consentedIds.push(p.id);
        }
      }

      const scheduledTime = input.scheduledAt ? new Date(input.scheduledAt) : new Date();

      const [campaign] = await db.insert(whatsappCampaigns).values({
        tenantId: ctx.tenantId,
        name: input.name,
        templateId: input.templateId,
        segmentType: input.segmentType,
        status: input.scheduledAt ? "scheduled" : "active",
        scheduledAt: scheduledTime,
        totalRecipients: consentedIds.length,
        createdBy: ctx.user.id,
      }).returning({ id: whatsappCampaigns.id });

      // Build static snapshot in Campaign Recipients table
      for (const pId of consentedIds) {
        try {
          await db.insert(whatsappCampaignRecipients).values({
            tenantId: ctx.tenantId,
            campaignId: campaign.id,
            patientId: pId,
            status: "queued",
          });
        } catch (e) {}
      }

      // Audit Log
      await db.insert(whatsappAuditLogs).values({
        tenantId: ctx.tenantId,
        userId: ctx.user.id,
        action: "campaign_created",
        targetId: campaign.id,
        details: `Created campaign "${input.name}" with segment ${input.segmentType} targeting ${consentedIds.length} users.`,
      });

      // If scheduled immediately, queue notification jobs for each recipient
      if (!input.scheduledAt) {
        const tpl = await db.select().from(whatsappTemplates).where(eq(whatsappTemplates.id, input.templateId)).get();
        if (tpl) {
          const { queueWhatsAppMessage } = await import("./lib/queue-helper");
          for (const pId of consentedIds) {
            const patientData = await db.select().from(patients).where(eq(patients.id, pId)).get();
            if (patientData) {
              await queueWhatsAppMessage({
                patientId: pId,
                templateKey: tpl.templateKey,
                parameters: [patientData.name],
                idempotencyKey: `campaign-${campaign.id}-patient-${pId}`,
              });
            }
          }
          await db.update(whatsappCampaigns)
            .set({ status: "completed", startedAt: new Date(), completedAt: new Date() })
            .where(eq(whatsappCampaigns.id, campaign.id));
        }
      }

      return { success: true };
    }),

  updateCampaignStatus: founderQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["active", "paused", "completed", "cancelled"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(whatsappCampaigns)
        .set({ status: input.status })
        .where(eq(whatsappCampaigns.id, input.id));

      await db.insert(whatsappAuditLogs).values({
        tenantId: ctx.tenantId,
        userId: ctx.user.id,
        action: "campaign_edited",
        targetId: input.id,
        details: `Set campaign status to ${input.status}`,
      });

      return { success: true };
    }),

  getPatientPreferences: founderQuery
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const pref = await db.select().from(patientPreferences).where(eq(patientPreferences.patientId, input.patientId)).get();
      if (!pref) {
        return {
          whatsappOptIn: true,
          marketingOptIn: true,
          communicationPreference: "whatsapp",
        };
      }
      return {
        whatsappOptIn: pref.whatsappOptIn === 1,
        marketingOptIn: pref.marketingOptIn === 1,
        communicationPreference: pref.communicationPreference,
      };
    }),

  savePatientPreferences: founderQuery
    .input(
      z.object({
        patientId: z.number(),
        whatsappOptIn: z.boolean(),
        marketingOptIn: z.boolean(),
        communicationPreference: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const existing = await db.select().from(patientPreferences).where(eq(patientPreferences.patientId, input.patientId)).get();

      const payload = {
        whatsappOptIn: input.whatsappOptIn ? 1 : 0,
        marketingOptIn: input.marketingOptIn ? 1 : 0,
        communicationPreference: input.communicationPreference,
        updatedAt: new Date(),
      };

      if (existing) {
        await db.update(patientPreferences).set(payload).where(eq(patientPreferences.id, existing.id));
      } else {
        await db.insert(patientPreferences).values({
          tenantId: ctx.tenantId,
          patientId: input.patientId,
          ...payload,
        });
      }

      return { success: true };
    }),
});
