import * as cookie from "cookie";
import { TRPCError } from "@trpc/server";
import { Session } from "@contracts/constants";
import { verifySessionToken } from "./session";
import { findUserByUsername } from "../queries/users";

export async function authenticateRequest(headers: Headers) {
  const cookies = cookie.parse(headers.get("cookie") || "");
  const token = cookies[Session.cookieName];
  if (!token) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid authentication token." });
  }
  const claim = await verifySessionToken(token);
  if (!claim) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid authentication token." });
  }
  const user = await findUserByUsername(claim.username);
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found. Please re-login." });
  }
  return user;
}
