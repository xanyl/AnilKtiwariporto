import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import { bearerToken, verifySession } from "./lib/session.mts";

const KEY = "overrides";
const ALLOWED_FIELDS = new Set([
  "profile",
  "summary",
  "experience",
  "projects",
  "skillGroups",
  "education",
  "certificates",
  "publications",
]);
const MAX_BYTES = 200_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export default async (req: Request) => {
  const store = getStore("resume");

  if (req.method === "GET") {
    const overrides = (await store.get(KEY, { type: "json" })) ?? {};
    return json({ overrides });
  }

  if (req.method === "PUT") {
    const session = verifySession(bearerToken(req));
    if (!session) return json({ error: "unauthorized" }, 401);

    const raw = await req.text();
    if (raw.length > MAX_BYTES) return json({ error: "payload too large" }, 413);

    let patch: Record<string, unknown>;
    try {
      patch = JSON.parse(raw);
    } catch {
      return json({ error: "invalid json" }, 400);
    }
    if (typeof patch !== "object" || patch === null || Array.isArray(patch)) {
      return json({ error: "expected a JSON object" }, 400);
    }
    for (const key of Object.keys(patch)) {
      if (!ALLOWED_FIELDS.has(key)) return json({ error: `unknown field: ${key}` }, 400);
    }

    const current = (await store.get(KEY, { type: "json" })) ?? {};
    const next = { ...(current as object), ...patch };
    await store.setJSON(KEY, next);
    return json({ overrides: next });
  }

  if (req.method === "DELETE") {
    const session = verifySession(bearerToken(req));
    if (!session) return json({ error: "unauthorized" }, 401);
    const url = new URL(req.url);
    const field = url.searchParams.get("field");
    if (!field || !ALLOWED_FIELDS.has(field)) return json({ error: "unknown field" }, 400);
    const current = ((await store.get(KEY, { type: "json" })) ?? {}) as Record<string, unknown>;
    delete current[field];
    await store.setJSON(KEY, current);
    return json({ overrides: current });
  }

  return json({ error: "method not allowed" }, 405);
};

export const config: Config = { path: "/api/resume-data" };
