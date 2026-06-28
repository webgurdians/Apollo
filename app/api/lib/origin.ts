import { env } from "./env";

function isLocalhost(host: string): boolean {
  return host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
}

export function validateRequestOrigin(headers: Headers): { ok: boolean; reason?: string } {
  const origin = headers.get("origin");
  const referer = headers.get("referer");
  const host = headers.get("host");

  if (!host) {
    return { ok: false, reason: "Missing Host header" };
  }

  // If Origin is present, validate it against Host
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const matchesHost = originUrl.host === host && (originUrl.protocol === "http:" || originUrl.protocol === "https:");
      const matchesAllowed = env.allowedOrigins.includes(originUrl.origin);
      
      if (!matchesHost && !matchesAllowed) {
        return { ok: false, reason: `Origin ${origin} does not match host ${host} and is not in allowed origins` };
      }
    } catch {
      return { ok: false, reason: "Invalid Origin header" };
    }
    return { ok: true };
  }

  // If Referer is present (no Origin), validate it
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const matchesHost = refererUrl.host === host && (refererUrl.protocol === "http:" || refererUrl.protocol === "https:");
      const matchesAllowed = env.allowedOrigins.includes(refererUrl.origin);
      
      if (!matchesHost && !matchesAllowed) {
        return { ok: false, reason: `Referer ${referer} does not match host ${host} and is not in allowed origins` };
      }
    } catch {
      return { ok: false, reason: "Invalid Referer header" };
    }
    return { ok: true };
  }

  // No Origin or Referer — likely a direct API call or curl
  // Allow it for flexibility (e.g., mobile apps, scripts), but log in dev
  return { ok: true };
}
