import { getDb } from "../queries/connection";
import { notificationJobs, patientPreferences } from "@db/schema";
import { eq } from "drizzle-orm";

export async function queueWhatsAppMessage({
  patientId,
  templateKey,
  parameters,
  idempotencyKey,
  tenantId = "default"
}: {
  patientId: number;
  templateKey: string;
  parameters: string[];
  idempotencyKey: string;
  tenantId?: string;
}) {
  const db = getDb();
  try {
    // 1. Ensure patient preference record exists
    let pref = await db.select().from(patientPreferences).where(eq(patientPreferences.patientId, patientId)).get();
    if (!pref) {
      try {
        await db.insert(patientPreferences).values({
          tenantId,
          patientId,
          whatsappOptIn: 1,
          marketingOptIn: 1,
          communicationPreference: "whatsapp",
        });
      } catch (e) {}
      pref = { whatsappOptIn: 1, marketingOptIn: 1 } as any;
    }

    // Skip if completely opted out of WhatsApp
    if (pref && pref.whatsappOptIn === 0) {
      console.log(`Skipping queueing message for patient ${patientId} due to WhatsApp opt-out`);
      return;
    }

    const payload = JSON.stringify({
      patientId,
      templateKey,
      parameters,
      tenantId
    });

    // 2. Insert job into queue
    await db.insert(notificationJobs).values({
      tenantId,
      jobType: "whatsapp_send",
      payload,
      idempotencyKey,
      status: "pending",
      attempts: 0,
      nextRetryAt: new Date(),
    });
    console.log(`Queued WhatsApp message: ${idempotencyKey}`);
  } catch (err: any) {
    if (err.message && err.message.includes("UNIQUE constraint failed")) {
      console.log(`Duplicate job skipped for idempotency: ${idempotencyKey}`);
    } else {
      console.error("Failed to queue WhatsApp message:", err);
    }
  }
}
