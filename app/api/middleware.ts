import { ErrorMessages } from "@contracts/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

import { getDb } from "./queries/connection";
import { emergencyKillswitches } from "../db/schema";
import { eq } from "drizzle-orm";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

const requireAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ErrorMessages.unauthenticated,
    });
  }

  // Platform owner and founder (temporary) roles bypass maintenance mode. All other roles are blocked.
  if (ctx.user.role !== "platform_owner" && ctx.user.role !== "founder") {
    try {
      const db = getDb();
      const killswitch = await db
        .select()
        .from(emergencyKillswitches)
        .where(eq(emergencyKillswitches.key, "maintenance_mode"))
        .limit(1);

      if (killswitch.length > 0 && killswitch[0].active) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Clinic administration is temporarily offline for scheduled developer maintenance.",
        });
      }
    } catch (e) {
      // Allow boot phase/migrations to complete if tables do not exist yet
      if (e instanceof Error && !e.message.includes("no such table")) {
        throw e;
      }
    }
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

function requireRole(roles: string[]) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || !roles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: ErrorMessages.insufficientRole,
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

export const authedQuery = t.procedure.use(requireAuth);
export const adminQuery = authedQuery.use(requireRole(["founder", "developer_preview", "admin"]));
export const staffQuery = authedQuery.use(requireRole(["founder", "developer_preview", "admin", "staff", "front_desk"]));
export const clinicStaffQuery = authedQuery.use(requireRole(["founder", "developer_preview", "admin", "staff", "front_desk", "doctor"]));
export const doctorQuery = authedQuery.use(requireRole(["founder", "developer_preview", "admin", "doctor"]));
export const frontDeskQuery = authedQuery.use(requireRole(["founder", "developer_preview", "admin", "staff", "front_desk"]));
export const pharmacyQuery = authedQuery.use(requireRole(["founder", "developer_preview", "admin", "pharmacy"]));
export const diagnosticsQuery = authedQuery.use(requireRole(["founder", "developer_preview", "admin", "diagnostics"]));
export const billingQuery = authedQuery.use(requireRole(["founder", "developer_preview", "admin", "front_desk"]));
export const platformOwnerQuery = authedQuery.use(requireRole(["platform_owner", "founder"]));
export const founderQuery = platformOwnerQuery;
export const founderMutation = platformOwnerQuery;
