import { getDb } from "../queries/connection";
import { notificationJobs, deadNotificationJobs, whatsappSettings, whatsappMessages, whatsappTemplates, patientPreferences, patients } from "@db/schema";
import { eq, and, or, lt, sql } from "drizzle-orm";
import { decrypt } from "./crypto";

const WORKER_ID = `worker_${Math.random().toString(36).substring(2, 11)}`;

// Simple country code validator and cleaner
function validateAndCleanPhone(phone: string): { valid: boolean; cleanPhone: string } {
  // Remove non-digit characters
  const cleaned = phone.replace(/\D/g, "");
  
  // For Indian phone numbers, if length is 10, prepend "91"
  if (cleaned.length === 10) {
    return { valid: true, cleanPhone: "91" + cleaned };
  } else if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return { valid: true, cleanPhone: cleaned };
  } else if (cleaned.length >= 10 && cleaned.length <= 15) {
    // Other generic valid range
    return { valid: true, cleanPhone: cleaned };
  }
  return { valid: false, cleanPhone: cleaned };
}

// Simulated or real Meta API Sender
async function sendWhatsAppMessage(
  tenantId: string,
  toPhone: string,
  templateKey: string,
  parameters: any[]
): Promise<{ success: boolean; providerMessageId?: string; errorMessage?: string }> {
  const db = getDb();
  // Fetch active settings for the tenant
  const settings = await db.select().from(whatsappSettings).where(eq(whatsappSettings.tenantId, tenantId)).get();
  
  const token = settings?.metaAccessTokenEncrypted ? decrypt(settings.metaAccessTokenEncrypted) : null;
  const phoneId = settings?.phoneNumberId;

  // If no credentials, run in simulated/mock mode
  if (!token || !phoneId) {
    console.log(`[WhatsApp Simulator] Sending template "${templateKey}" to ${toPhone} with params:`, parameters);
    return {
      success: true,
      providerMessageId: `mock_msg_${Math.random().toString(36).substring(2, 15)}`,
    };
  }

  // Real Meta Cloud API Call
  try {
    const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toPhone,
        type: "template",
        template: {
          name: templateKey,
          language: {
            code: "en",
          },
          components: parameters.length > 0 ? [
            {
              type: "body",
              parameters: parameters.map(p => ({
                type: "text",
                text: String(p),
              })),
            },
          ] : [],
        },
      }),
    });

    const data = await response.json() as any;
    if (response.ok && data.messages?.[0]?.id) {
      return {
        success: true,
        providerMessageId: data.messages[0].id,
      };
    } else {
      const errMsg = data.error?.message || "Unknown Meta API error";
      return {
        success: false,
        errorMessage: errMsg,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      errorMessage: err.message || "Network error calling Meta API",
    };
  }
}

export async function processNotificationQueue() {
  const db = getDb();
  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

  // 1. Recover stuck jobs (locked > 10 minutes ago)
  try {
    await db.update(notificationJobs)
      .set({
        status: "pending",
        lockedAt: null,
        lockedBy: null,
      })
      .where(
        and(
          eq(notificationJobs.status, "processing"),
          lt(notificationJobs.lockedAt, tenMinutesAgo)
        )
      );
  } catch (e) {
    console.error("Worker lock recovery error:", e);
  }

  // 2. Fetch eligible jobs
  // eligible: pending OR (failed and attempts < 5 and nextRetryAt < now)
  let jobs: any[] = [];
  try {
    jobs = await db.select()
      .from(notificationJobs)
      .where(
        or(
          eq(notificationJobs.status, "pending"),
          and(
            eq(notificationJobs.status, "failed"),
            lt(notificationJobs.attempts, 5),
            lt(notificationJobs.nextRetryAt, now)
          )
        )
      )
      .all();
  } catch (e) {
    console.error("Worker query error:", e);
    return;
  }

  for (const job of jobs) {
    // Atomic acquisition of lock
    try {
      const updated = await db.update(notificationJobs)
        .set({
          status: "processing",
          lockedAt: now,
          lockedBy: WORKER_ID,
          attempts: job.attempts + 1,
        })
        .where(
          and(
            eq(notificationJobs.id, job.id),
            or(
              eq(notificationJobs.status, "pending"),
              eq(notificationJobs.status, "failed")
            )
          )
        );

      // If no row was updated, another worker acquired the job first
      if (!updated) continue;
    } catch (e) {
      console.error(`Worker locking failed for job ${job.id}:`, e);
      continue;
    }

    // Process job
    try {
      const payload = JSON.parse(job.payload);
      const { patientId, templateKey, parameters, tenantId } = payload;

      // Check opt-in preferences for the patient
      const pref = await db.select().from(patientPreferences).where(eq(patientPreferences.patientId, patientId)).get();
      const patientData = await db.select().from(patients).where(eq(patients.id, patientId)).get();

      if (!patientData) {
        throw new Error("Patient not found");
      }

      // Check transactional vs marketing consent rules
      const isMarketing = job.jobType === "whatsapp_marketing" || templateKey.includes("marketing");
      if (pref) {
        if (isMarketing && pref.marketingOptIn === 0) {
          throw new Error("Patient opted out of marketing campaigns");
        }
        if (pref.whatsappOptIn === 0) {
          throw new Error("Patient opted out of WhatsApp messages completely");
        }
      }

      // Validate patient phone number
      const { valid, cleanPhone } = validateAndCleanPhone(patientData.phone);
      if (!valid) {
        throw new Error(`Invalid country code or phone number length: ${patientData.phone}`);
      }

      // Send via Meta or Mock API
      const result = await sendWhatsAppMessage(tenantId || "default", cleanPhone, templateKey, parameters || []);

      if (result.success) {
        // Complete the job
        await db.update(notificationJobs)
          .set({
            status: "completed",
            processedAt: new Date(),
            lockedAt: null,
            lockedBy: null,
          })
          .where(eq(notificationJobs.id, job.id));

        // Get template reference
        const matchedTemplate = await db.select()
          .from(whatsappTemplates)
          .where(eq(whatsappTemplates.templateKey, templateKey))
          .get();

        // Write log to whatsapp_messages
        await db.insert(whatsappMessages).values({
          tenantId: tenantId || "default",
          patientId: patientId,
          templateId: matchedTemplate?.id || null,
          messageType: isMarketing ? "marketing" : "transactional",
          status: "sent",
          conversationCategory: isMarketing ? "marketing" : "utility",
          providerMessageId: result.providerMessageId || null,
          sentAt: new Date(),
        });
      } else {
        throw new Error(result.errorMessage || "Meta delivery failed");
      }
    } catch (err: any) {
      console.error(`Error processing job ${job.id}:`, err.message);
      
      const newAttempts = job.attempts + 1;
      if (newAttempts >= 5) {
        // Exceeded 5 attempts, move to dead letter queue
        try {
          await db.insert(deadNotificationJobs).values({
            tenantId: job.tenantId,
            jobType: job.jobType,
            payload: job.payload,
            errorMessage: err.message || "Exceeded maximum retry attempts",
          });
          
          await db.delete(notificationJobs).where(eq(notificationJobs.id, job.id));
        } catch (e) {
          console.error("Failed to move job to DLQ:", e);
        }
      } else {
        // Retry backoff calculation: retry in attempts * 60 seconds
        const nextRetry = new Date(Date.now() + newAttempts * 60 * 1000);
        await db.update(notificationJobs)
          .set({
            status: "failed",
            nextRetryAt: nextRetry,
            lockedAt: null,
            lockedBy: null,
          })
          .where(eq(notificationJobs.id, job.id));
      }
    }
  }
}

// Start worker background interval loop
export function startWorkerService() {
  console.log(`[Worker] Started background worker service (${WORKER_ID}) polling every 10 seconds`);
  setInterval(async () => {
    try {
      await processNotificationQueue();
    } catch (err) {
      console.error("Worker processing loop exception:", err);
    }
  }, 10000);
}
