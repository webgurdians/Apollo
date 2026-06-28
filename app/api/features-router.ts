import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, founderQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { settings, featureFlags } from "../db/schema";
import { eq } from "drizzle-orm";

export const featuresRouter = createRouter({
  list: authedQuery.query(async () => {
    const db = getDb();
    const rows = await db
      .select({ key: featureFlags.key, enabled: featureFlags.enabled })
      .from(featureFlags)
      .where(eq(featureFlags.tenantId, "apollo-aranghata"));

    const flags: Record<string, boolean> = {};
    for (const row of rows) {
      flags[row.key] = row.enabled;
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
