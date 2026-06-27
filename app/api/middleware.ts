import { ErrorMessages } from "@contracts/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

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
export const adminQuery = authedQuery.use(requireRole(["founder", "admin"]));
export const staffQuery = authedQuery.use(requireRole(["founder", "admin", "staff", "front_desk"]));
export const clinicStaffQuery = authedQuery.use(requireRole(["founder", "admin", "staff", "front_desk", "doctor"]));
export const doctorQuery = authedQuery.use(requireRole(["founder", "admin", "doctor"]));
export const frontDeskQuery = authedQuery.use(requireRole(["founder", "admin", "staff", "front_desk"]));
export const pharmacyQuery = authedQuery.use(requireRole(["founder", "admin", "pharmacy"]));
export const diagnosticsQuery = authedQuery.use(requireRole(["founder", "admin", "diagnostics"]));
export const billingQuery = authedQuery.use(requireRole(["founder", "admin", "front_desk"]));
export const founderQuery = authedQuery.use(requireRole(["founder"]));
