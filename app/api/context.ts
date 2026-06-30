import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { authenticateRequest } from "./auth/authenticate";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
  tenantId: string;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders, tenantId: "apollo-aranghata" };
  try {
    ctx.user = await authenticateRequest(opts.req.headers);
    if (ctx.user?.role === "developer_preview") {
      ctx.tenantId = "apollo_preview";
    }
  } catch {
    // Authentication is optional here
  }
  return ctx;
}
