import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";
import { guestbookPostSchema } from "./lib/schema.mts";
import { bearerToken, hashIp, verifySession } from "./lib/session.mts";

const ENTRIES_KEY = "entries";
const LOG_KEY = "log";
const MAX_ENTRIES = 300;
const MAX_LOG_ENTRIES = 200;
const MAX_BYTES = 2_000;

const MIN_GAP_MS = 15 * 1000;
const HOURLY_LIMIT = 8;
const HOUR_MS = 60 * 60 * 1000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

interface WallEntry {
  id: string;
  name: string;
  message: string;
  at: string;
}

interface GuardState {
  lastPostAt: number;
  count: number;
  windowStart: number;
}

interface ModerationLogEntry {
  action: "delete" | "delete-all";
  id?: string;
  count?: number;
  at: string;
}

export default async (req: Request, context: Context) => {
  const store = getStore("guestbook");

  if (req.method === "GET") {
    const entries = ((await store.get(ENTRIES_KEY, { type: "json" })) as WallEntry[] | null) ?? [];
    return json({ entries });
  }

  if (req.method === "POST") {
    const guardKey = `post:${hashIp(context.ip || "unknown")}`;
    const now = Date.now();
    const guardState = ((await store.get(guardKey, { type: "json" })) as GuardState | null) ?? {
      lastPostAt: 0,
      count: 0,
      windowStart: now,
    };

    if (now - guardState.lastPostAt < MIN_GAP_MS) {
      return json({ error: "slow down - wait a few seconds between posts" }, 429);
    }

    const windowExpired = now - guardState.windowStart > HOUR_MS;
    const count = windowExpired ? 0 : guardState.count;
    if (count >= HOURLY_LIMIT) {
      return json({ error: "guestbook post limit reached - try again later" }, 429);
    }

    const raw = await req.text();
    if (raw.length > MAX_BYTES) return json({ error: "payload too large" }, 413);

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ error: "invalid json" }, 400);
    }

    const result = guestbookPostSchema.safeParse(body);
    if (!result.success) {
      return json({ error: result.error.issues[0]?.message ?? "invalid entry" }, 400);
    }

    const entry: WallEntry = {
      id: crypto.randomUUID(),
      name: result.data.name,
      message: result.data.message,
      at: new Date().toISOString(),
    };

    const entries = ((await store.get(ENTRIES_KEY, { type: "json" })) as WallEntry[] | null) ?? [];
    entries.unshift(entry);
    await store.setJSON(ENTRIES_KEY, entries.slice(0, MAX_ENTRIES));
    await store.setJSON(guardKey, {
      lastPostAt: now,
      count: count + 1,
      windowStart: windowExpired ? now : guardState.windowStart,
    } satisfies GuardState);

    return json({ entry });
  }

  if (req.method === "DELETE") {
    const session = verifySession(bearerToken(req));
    if (!session) return json({ error: "unauthorized" }, 401);

    const url = new URL(req.url);
    const log = ((await store.get(LOG_KEY, { type: "json" })) as ModerationLogEntry[] | null) ?? [];

    if (url.searchParams.get("all") === "1") {
      const entries = ((await store.get(ENTRIES_KEY, { type: "json" })) as WallEntry[] | null) ?? [];
      if (entries.length === 0) return json({ error: "guestbook is already empty" }, 404);

      await store.setJSON(ENTRIES_KEY, []);
      log.unshift({ action: "delete-all", count: entries.length, at: new Date().toISOString() });
      await store.setJSON(LOG_KEY, log.slice(0, MAX_LOG_ENTRIES));

      return json({ entries: [], deleted: entries.length });
    }

    const id = url.searchParams.get("id");
    if (!id) return json({ error: "missing id" }, 400);

    const entries = ((await store.get(ENTRIES_KEY, { type: "json" })) as WallEntry[] | null) ?? [];
    const next = entries.filter((e) => e.id !== id);
    if (next.length === entries.length) return json({ error: "no such entry" }, 404);

    await store.setJSON(ENTRIES_KEY, next);
    log.unshift({ action: "delete", id, at: new Date().toISOString() });
    await store.setJSON(LOG_KEY, log.slice(0, MAX_LOG_ENTRIES));

    return json({ entries: next });
  }

  return json({ error: "method not allowed" }, 405);
};

export const config: Config = { path: "/api/guestbook" };
