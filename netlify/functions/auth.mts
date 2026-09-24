import crypto from "node:crypto";
import type { Config } from "@netlify/functions";
import { signSession } from "./lib/session.mts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export default async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !process.env.AUTH_SECRET) {
    return json({ error: "auth is not configured on this deploy" }, 500);
  }

  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return json({ error: "bad request" }, 400);
  }

  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!match) return json({ error: "invalid password" }, 401);

  const token = signSession("admin");
  return json({ token, expiresInSeconds: 12 * 60 * 60 });
};

export const config: Config = { path: "/api/auth" };
