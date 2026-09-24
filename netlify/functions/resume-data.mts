import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";
import { RESUME_FIELD_SCHEMAS } from "./lib/schema.mts";
import type { ResumeFieldName } from "./lib/schema.mts";
import { bearerToken, verifySession } from "./lib/session.mts";

const KEY = "overrides";
const AUDIT_KEY = "log";
const MAX_AUDIT_ENTRIES = 200;
const MAX_BYTES = 200_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

interface AuditEntry {
  field: string;
  action: "set" | "reset";
  at: string;
  ip: string;
}

async function appendAudit(store: ReturnType<typeof getStore>, entry: AuditEntry) {
  const log = ((await store.get(AUDIT_KEY, { type: "json" })) as AuditEntry[] | null) ?? [];
  log.unshift(entry);
  await store.setJSON(AUDIT_KEY, log.slice(0, MAX_AUDIT_ENTRIES));
}

export default async (req: Request, context: Context) => {
  const store = getStore("resume");
  const ip = context.ip || "unknown";

  if (req.method === "GET") {
    const url = new URL(req.url);
    if (url.searchParams.get("audit") === "1") {
      const session = verifySession(bearerToken(req));
      if (!session) return json({ error: "unauthorized" }, 401);
      const log = (await store.get(AUDIT_KEY, { type: "json" })) ?? [];
      return json({ log });
    }
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

    const validated: Record<string, unknown> = {};
    for (const key of Object.keys(patch)) {
      if (!Object.hasOwn(RESUME_FIELD_SCHEMAS, key)) {
        return json({ error: `unknown field: ${key}` }, 400);
      }
      const schema = RESUME_FIELD_SCHEMAS[key as ResumeFieldName];
      const result = schema.safeParse(patch[key]);
      if (!result.success) {
        return json({ error: `invalid value for ${key}: ${result.error.issues[0]?.message}` }, 400);
      }
      validated[key] = result.data;
    }

    const current = (await store.get(KEY, { type: "json" })) ?? {};
    const next = { ...(current as object), ...validated };
    await store.setJSON(KEY, next);
    await Promise.all(
      Object.keys(validated).map((field) =>
        appendAudit(store, { field, action: "set", at: new Date().toISOString(), ip })
      )
    );
    return json({ overrides: next });
  }

  if (req.method === "DELETE") {
    const session = verifySession(bearerToken(req));
    if (!session) return json({ error: "unauthorized" }, 401);
    const url = new URL(req.url);
    const field = url.searchParams.get("field");
    if (!field || !Object.hasOwn(RESUME_FIELD_SCHEMAS, field)) {
      return json({ error: "unknown field" }, 400);
    }
    const current = ((await store.get(KEY, { type: "json" })) ?? {}) as Record<string, unknown>;
    delete current[field];
    await store.setJSON(KEY, current);
    await appendAudit(store, { field, action: "reset", at: new Date().toISOString(), ip });
    return json({ overrides: current });
  }

  return json({ error: "method not allowed" }, 405);
};

export const config: Config = { path: "/api/resume-data" };
