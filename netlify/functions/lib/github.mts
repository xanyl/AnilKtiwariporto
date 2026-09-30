const API_BASE = "https://api.github.com";

export interface GithubConfig {
  token: string;
  repo: string; // "owner/repo"
  branch: string;
  filePath: string;
}

export function getGithubConfig(): GithubConfig | null {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return null;
  return {
    token,
    repo,
    branch: process.env.GITHUB_BRANCH || "main",
    filePath: process.env.GITHUB_RESUME_PATH || "src/data/resume.ts",
  };
}

async function ghFetch(config: GithubConfig, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${config.token}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export type CommitResult = { ok: true; commitSha: string } | { ok: false; error: string };

/**
 * Replaces one or more `export const <field> = ...;` statements in the resume
 * source with freshly-serialized values, then commits the whole file in a
 * single GitHub Contents API write. This never runs a full TS parser - it
 * balances brackets/quotes to find each statement's span, so it only
 * understands the flat "export const X = <expr>;" shape resume.ts already
 * uses.
 */
export async function commitResumeFields(
  config: GithubConfig,
  fields: Record<string, unknown>,
  message: string
): Promise<CommitResult> {
  const getRes = await ghFetch(
    config,
    `/repos/${config.repo}/contents/${encodeURIComponent(config.filePath)}?ref=${encodeURIComponent(config.branch)}`
  );
  if (!getRes.ok) {
    return { ok: false, error: `could not read ${config.filePath} from GitHub (${getRes.status})` };
  }
  const fileData = (await getRes.json()) as { content: string; sha: string };
  const source = Buffer.from(fileData.content, "base64").toString("utf-8");

  let updated = source;
  for (const [field, value] of Object.entries(fields)) {
    const next = replaceExportedConst(updated, field, value);
    if (next === null) {
      return { ok: false, error: `could not find "export const ${field}" in ${config.filePath}` };
    }
    updated = next;
  }
  if (updated === source) {
    return { ok: false, error: "no source changes to commit" };
  }

  const putRes = await ghFetch(config, `/repos/${config.repo}/contents/${encodeURIComponent(config.filePath)}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: Buffer.from(updated, "utf-8").toString("base64"),
      sha: fileData.sha,
      branch: config.branch,
    }),
  });
  if (!putRes.ok) {
    const body = (await putRes.json().catch(() => ({}))) as { message?: string };
    return { ok: false, error: body.message ?? `commit failed (${putRes.status})` };
  }
  const putBody = (await putRes.json()) as { commit: { sha: string } };
  return { ok: true, commitSha: putBody.commit.sha };
}

/** Finds the index just past the end of the JS statement starting at `start` (the `;`), skipping over string/template contents so braces inside strings don't throw off the bracket count. */
function findStatementEnd(src: string, start: number): number {
  let i = start;
  let depth = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      i += 1;
      while (i < src.length) {
        if (src[i] === "\\") {
          i += 2;
          continue;
        }
        if (src[i] === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    if (c === "{" || c === "[" || c === "(") {
      depth += 1;
      i += 1;
      continue;
    }
    if (c === "}" || c === "]" || c === ")") {
      depth -= 1;
      i += 1;
      continue;
    }
    if (c === ";" && depth === 0) return i;
    i += 1;
  }
  return i;
}

function replaceExportedConst(source: string, field: string, value: unknown): string | null {
  const declRe = new RegExp(`export const ${field}\\b[^=]*=\\s*`);
  const match = declRe.exec(source);
  if (!match) return null;
  const valueStart = match.index + match[0].length;
  const valueEnd = findStatementEnd(source, valueStart);
  const replacement = JSON.stringify(value, null, 2);
  return source.slice(0, valueStart) + replacement + source.slice(valueEnd);
}
