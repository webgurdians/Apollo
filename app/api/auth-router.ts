import * as cookie from "cookie";
import { z } from "zod";
import crypto from "crypto";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { rateLimit } from "./lib/rate-limit";
import { createRouter, authedQuery, publicQuery, adminQuery } from "./middleware";
import { findUserByUsername, createUser, updateLastSignIn } from "./queries/users";
import { signSessionToken } from "./auth/session";
import { TRPCError } from "@trpc/server";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq, ne } from "drizzle-orm";
import { logActivity } from "./lib/activity";

const roleEnum = z.enum(["user", "staff", "admin", "front_desk", "doctor", "pharmacy", "diagnostics", "founder"]);

export const authRouter = createRouter({
  me: authedQuery.query((opts) => opts.ctx.user),

  login: publicQuery
    .input(z.object({ username: z.string(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const clientIp = ctx.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || ctx.req.headers.get("x-real-ip")
        || "unknown";
      const result = rateLimit(`login:${clientIp}`, { maxRequests: 10, windowMs: 15 * 60 * 1000 });
      if (!result.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Too many login attempts. Try again after ${Math.ceil((result.resetAt - Date.now()) / 1000)} seconds.`,
        });
      }

      const user = await findUserByUsername(input.username);
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      }

      if (user.role === "doctor" || user.role === "pharmacy" || user.role === "diagnostics") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Login access for this role is currently deactivated.",
        });
      }

      if (user.deletedAt) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Account has been deactivated" });
      }

      const [salt, key] = user.passwordHash.split(":");
      const hashedBuffer = crypto.scryptSync(input.password, salt, 64);
      const keyBuffer = Buffer.from(key, "hex");

      const match = crypto.timingSafeEqual(hashedBuffer, keyBuffer);
      if (!match) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      }

      await updateLastSignIn(user.username);

      const token = await signSessionToken({ username: user.username });
      const opts = getSessionCookieOptions(ctx.req.headers);

      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(Session.cookieName, token, {
          httpOnly: opts.httpOnly,
          path: opts.path,
          sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
          secure: opts.secure,
        })
      );

      await logActivity(user, "login", "user", user.id);

      return { success: true, role: user.role };
    }),

  createUser: adminQuery
    .input(z.object({
      username: z.string().min(3),
      password: z.string().min(6),
      name: z.string(),
      role: roleEnum,
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await findUserByUsername(input.username);
      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Username already exists" });
      }

      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto.scryptSync(input.password, salt, 64).toString("hex");
      const passwordHash = `${salt}:${hash}`;

      await createUser({
        username: input.username,
        passwordHash,
        name: input.name,
        role: input.role,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignInAt: new Date(),
      });

      await logActivity(ctx.user, "create", "user", undefined, `Created user ${input.username} with role ${input.role}`);

      return { success: true };
    }),

  listUsers: adminQuery.query(async ({ ctx }) => {
    const db = getDb();
    const query = db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        lastSignInAt: users.lastSignInAt,
        deletedAt: users.deletedAt,
      })
      .from(users);

    if (ctx.user.role !== "founder") {
      return await query.where(ne(users.role, "founder")).orderBy(users.createdAt);
    }
    return await query.orderBy(users.createdAt);
  }),

  updateUserRole: adminQuery
    .input(z.object({
      id: z.number(),
      role: roleEnum,
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [user] = await db.select().from(users).where(eq(users.id, input.id)).limit(1);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.id));
      await logActivity(ctx.user, "update", "user", input.id, `Changed role to ${input.role} for ${user.username}`);
      return { success: true };
    }),

  deleteUser: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [user] = await db.select().from(users).where(eq(users.id, input.id)).limit(1);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, input.id));
      await logActivity(ctx.user, "delete", "user", input.id, `Soft-deleted user ${user.username}`);
      return { success: true };
    }),

  restoreUser: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [user] = await db.select().from(users).where(eq(users.id, input.id)).limit(1);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      await db.update(users).set({ deletedAt: null }).where(eq(users.id, input.id));
      await logActivity(ctx.user, "restore", "user", input.id, `Restored user ${user.username}`);
      return { success: true };
    }),

  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    await logActivity(ctx.user, "logout", "user", ctx.user.id);
    return { success: true };
  }),
});
