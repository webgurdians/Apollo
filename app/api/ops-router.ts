import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, founderQuery, founderMutation } from "./middleware";
import { getDb } from "./queries/connection";
import { 
  featureFlags, 
  emergencyKillswitches, 
  auditLogs, 
  tenants 
} from "../db/schema";
import { eq, sql } from "drizzle-orm";

// OCC Auto-Auditing Utility
async function logOpsAction(
  db: ReturnType<typeof getDb>,
  ip: string,
  ua: string,
  tenantId: string,
  username: string,
  action: string,
  module: string,
  metadata: Record<string, unknown>
) {
  await db.insert(auditLogs).values({
    tenantId,
    username,
    action,
    module,
    metadata: JSON.stringify({ ...metadata, ip, ua }),
    timestamp: new Date()
  });
}

export const opsRouter = createRouter({
  // 1. Dashboard Overview Stats (with Sprint 2 placeholders)
  getOpsDashboard: founderQuery.query(async () => {
    const db = getDb();
    
    // Count active feature flags
    const activeFlagsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(featureFlags)
      .where(eq(featureFlags.enabled, true));
    const activeFlags = activeFlagsResult[0]?.count ?? 0;

    // Count active killswitches
    const activeKillswitchesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(emergencyKillswitches)
      .where(eq(emergencyKillswitches.active, true));
    const activeKillswitches = activeKillswitchesResult[0]?.count ?? 0;

    return {
      activeFlags,
      activeKillswitches,
      unresolvedErrors: 0, // Sprint 2 placeholder
      lastBackup: null,    // Sprint 2 placeholder
      latestRelease: null  // Sprint 2 placeholder
    };
  }),

  // 2. Feature Flags
  getFeatureFlags: founderQuery.query(async () => {
    const db = getDb();
    // OCC only manages production tenant flags — preview tenant flags are seeded automatically
    return await db.select().from(featureFlags).where(eq(featureFlags.tenantId, "apollo-aranghata"));
  }),

  toggleFeatureFlag: founderMutation
    .input(z.object({
      id: z.string(),
      status: z.enum(["disabled", "preview", "enabled"])
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      
      // Get the existing flag details for auditing
      const existing = await db
        .select()
        .from(featureFlags)
        .where(eq(featureFlags.id, input.id))
        .limit(1);
 
      if (existing.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Feature flag not found" });
      }
 
      const flag = existing[0];
      const eventName = input.status === "enabled" ? "feature_enabled" : 
                        input.status === "disabled" ? "feature_disabled" : 
                        "feature_preview";
 
      // Update in DB
      await db
        .update(featureFlags)
        .set({ 
          enabled: input.status === "enabled", 
          status: input.status, 
          updatedAt: new Date() 
        })
        .where(eq(featureFlags.id, input.id));
 
      // Audit Log write
      const ip1 = ctx.req.headers.get("x-forwarded-for") || ctx.req.headers.get("x-real-ip") || "unknown";
      const ua1 = ctx.req.headers.get("user-agent") || "unknown";
      await logOpsAction(
        db,
        ip1,
        ua1,
        flag.tenantId || "system",
        ctx.user.username,
        eventName,
        "feature_flags",
        {
          actor_id: ctx.user.id,
          actor_role: ctx.user.role,
          tenant_id: flag.tenantId || "system",
          feature_key: flag.key,
          old_state: flag.status || "disabled",
          new_state: input.status,
          timestamp: new Date().toISOString()
        }
      );
 
      return { success: true };
    }),

  // 3. Emergency Killswitches
  getKillswitches: founderQuery.query(async () => {
    const db = getDb();
    return await db.select().from(emergencyKillswitches);
  }),

  toggleKillswitch: founderMutation
    .input(z.object({
      key: z.string(),
      active: z.boolean()
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const existing = await db
        .select()
        .from(emergencyKillswitches)
        .where(eq(emergencyKillswitches.key, input.key))
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Killswitch not found" });
      }

      const sw = existing[0];

      await db
        .update(emergencyKillswitches)
        .set({ 
          active: input.active, 
          triggeredBy: ctx.user.username, 
          triggeredAt: new Date() 
        })
        .where(eq(emergencyKillswitches.key, input.key));

      const ip2 = ctx.req.headers.get("x-forwarded-for") || ctx.req.headers.get("x-real-ip") || "unknown";
      const ua2 = ctx.req.headers.get("user-agent") || "unknown";
      await logOpsAction(
        db,
        ip2,
        ua2,
        "apollo-aranghata",
        ctx.user.username,
        "killswitch_toggled",
        "emergency_killswitches",
        {
          key: sw.key,
          previous: sw.active,
          next: input.active
        }
      );

      return { success: true };
    }),

  // 4. Audit Logs (Immutable)
  getAuditLogs: founderQuery.query(async () => {
    const db = getDb();
    return await db.select().from(auditLogs);
  })
});
