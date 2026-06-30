import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, founderQuery, authedQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { settings, featureFlags, emergencyKillswitches } from "../db/schema";
import { eq } from "drizzle-orm";

export const featuresRouter = createRouter({
  isMaintenanceMode: publicQuery.query(async () => {
    const db = getDb();
    try {
      const rows = await db
        .select({ active: emergencyKillswitches.active })
        .from(emergencyKillswitches)
        .where(eq(emergencyKillswitches.key, "maintenance_mode"))
        .limit(1);
      return rows[0]?.active === true;
    } catch {
      return false;
    }
  }),
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userRole = ctx.user?.role || "user";

    // 1. Fetch active killswitches
    let isWhatsappKilled = false;
    let isPaymentsKilled = false;
    try {
      const ksRows = await db.select().from(emergencyKillswitches);
      isWhatsappKilled = ksRows.find((k) => k.key === "disable_whatsapp")?.active === true;
      isPaymentsKilled = ksRows.find((k) => k.key === "disable_payments")?.active === true;
    } catch {
      // safe fallback
    }

    // 2. Fetch feature flags
    const rows = await db
      .select({ key: featureFlags.key, enabled: featureFlags.enabled, status: featureFlags.status })
      .from(featureFlags)
      .where(eq(featureFlags.tenantId, "apollo-aranghata"));

    const flags: Record<string, boolean> = {};
    
    // Default all expected keys to false for fail-closed safety
    const expectedKeys = [
      "appointments", "billing", "doctors", "whatsapp", "revenue", 
      "diagnostics", "online_consultation", "ai_receptionist", "reviews"
    ];
    for (const key of expectedKeys) {
      flags[key] = false;
    }

    for (const row of rows) {
      const status = row.status || "disabled";
      let isVisible = false;

      if (status === "preview") {
        isVisible = userRole === "developer_preview" || userRole === "platform_owner" || userRole === "founder";
      } else if (status === "enabled") {
        isVisible = userRole === "admin" || userRole === "developer_preview" || userRole === "platform_owner" || userRole === "founder";
      }

      flags[row.key] = isVisible;
    }

    // 3. Integrate Global Killswitches
    if (isWhatsappKilled) {
      flags["whatsapp"] = false;
    }
    if (isPaymentsKilled) {
      flags["billing"] = false;
      flags["revenue"] = false;
    }

    return flags;
  }),

  toggle: founderQuery
    .input(z.object({
      featureKey: z.string().min(1),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const rows = await db.select().from(settings).where(eq(settings.key, "features")).limit(1);
      let flags: Record<string, boolean> = {};
      if (rows.length) {
        try { flags = JSON.parse(rows[0].value); } catch { /* ignore */ }
      }
      flags[input.featureKey] = input.enabled;
      if (rows.length) {
        await db.update(settings).set({ value: JSON.stringify(flags) }).where(eq(settings.key, "features"));
      } else {
        await db.insert(settings).values({ key: "features", value: JSON.stringify(flags) });
      }
      return flags;
    }),

  create: founderQuery
    .input(z.object({
      name: z.string().min(1),
      key: z.string().min(1),
      enabledByDefault: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const rows = await db.select().from(settings).where(eq(settings.key, "features")).limit(1);
      let flags: Record<string, boolean> = {};
      if (rows.length) {
        try { flags = JSON.parse(rows[0].value); } catch { /* ignore */ }
      }
      if (input.key in flags) {
        throw new TRPCError({ code: "CONFLICT", message: `Feature "${input.key}" already exists` });
      }
      flags[input.key] = input.enabledByDefault;
      if (rows.length) {
        await db.update(settings).set({ value: JSON.stringify(flags) }).where(eq(settings.key, "features"));
      } else {
        await db.insert(settings).values({ key: "features", value: JSON.stringify(flags) });
      }
      return flags;
    }),
});
