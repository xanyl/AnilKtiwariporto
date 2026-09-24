import crypto from "node:crypto";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not configured");
  return s;
}

function b64url(input: Buffer): string {
  return input.toString("base64url");
}

export interface SessionPayload {
  sub: string;
  exp: number;
}

export function signSession(sub: string): string {
  const payload: SessionPayload = { sub, exp: Date.now() + SESSION_TTL_MS };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(crypto.createHmac("sha256", secret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifySession(token: string | null): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = b64url(crypto.createHmac("sha256", secret()).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : null;
}

/**
 * Rate-limit buckets need a stable per-visitor key, but there's no reason to
 * keep raw IPs sitting in Blobs — an HMAC gives the same dedup/lockout
 * behavior without persisting anything that identifies a real address.
 */
export function hashIp(ip: string): string {
  return crypto.createHmac("sha256", secret()).update(`ip:${ip}`).digest("base64url");
}
