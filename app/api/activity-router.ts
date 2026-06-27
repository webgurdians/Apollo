import { z } from "zod";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { activityLogs } from "@db/schema";
import { desc, eq } from "drizzle-orm";

export const activityRouter = createRouter({
  list: adminQuery
    .input(z.object({
      limit: z.number().min(1).max(200).default(100),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input?.limit ?? 100;
      const offset = input?.offset ?? 0;

      const logs = await db
        .select()
        .from(activityLogs)
        .orderBy(desc(activityLogs.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: db.$count(activityLogs) })
        .from(activityLogs);

      return { logs, total: count };
    }),

  getByEntity: adminQuery
    .input(z.object({
      entity: z.string(),
      entityId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const logs = await db
        .select()
        .from(activityLogs)
        .where(eq(activityLogs.entityId, input.entityId))
        .orderBy(desc(activityLogs.createdAt))
        .limit(50);
      return logs;
    }),
});
