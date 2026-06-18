import type { User } from "@db/schema";
import { getDb } from "../queries/connection";
import { activityLogs } from "@db/schema";

export type ActionType = "create" | "update" | "delete" | "restore" | "view" | "login" | "logout" | "payment" | "refund" | "backup" | "restore_system";

export async function logActivity(
  user: User,
  action: ActionType,
  entity: string,
  entityId?: number,
  details?: string,
) {
  const db = getDb();
  await db.insert(activityLogs).values({
    userId: user.id,
    userName: user.name || user.username,
    userRole: user.role,
    action,
    entity,
    entityId: entityId || null,
    details: details || null,
  });
}
