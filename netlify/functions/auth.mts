import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";
import { signSession } from "./lib/session.mts";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

interface GuardState {
  count: number;
  firstAttempt: number;
  lockedUntil?: number;
}

/**
 * Fixed-length digest compare instead of raw-buffer compare, so a wrong
 * password never leaks the real password's length through response timing.
 */
function passwordMatches(candidate: string, expected: string, secret: string): boolean {
  const mac = (s: string) => crypto.createHmac("sha256", secret).update(s).digest();
  const a = mac(candidate);
  const b = mac(expected);
  return crypto.timingSafeEqual(a, b);
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const expected = process.env.ADMIN_PASSWORD;
  const secret = process.env.AUTH_SECRET;
  if (!expected || !secret) {
    return json({ error: "auth is not configured on this deploy" }, 500);
  }

  const ip = context.ip || "unknown";
  const guard = getStore("auth-guard");
  const key = `attempts:${ip}`;
  const now = Date.now();
  const state = ((await guard.get(key, { type: "json" })) as GuardState | null) ?? {
    count: 0,
    firstAttempt: now,
  };

  if (state.lockedUntil && state.lockedUntil > now) {
    const retryInSeconds = Math.ceil((state.lockedUntil - now) / 1000);
    return json({ error: `too many attempts - try again in ${retryInSeconds}s` }, 429);
  }

  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return json({ error: "bad request" }, 400);
  }

  const match = passwordMatches(password, expected, secret);

  if (!match) {
    const windowExpired = now - state.firstAttempt > ATTEMPT_WINDOW_MS;
    const next: GuardState = windowExpired
      ? { count: 1, firstAttempt: now }
      : { count: state.count + 1, firstAttempt: state.firstAttempt };
    if (next.count >= MAX_ATTEMPTS) next.lockedUntil = now + LOCKOUT_MS;
    await guard.setJSON(key, next);
    return json({ error: "invalid password" }, 401);
  }

  await guard.delete(key);
  const token = signSession("admin");
  return json({ token, expiresInSeconds: 12 * 60 * 60 });
};

export const config: Config = { path: "/api/auth" };
