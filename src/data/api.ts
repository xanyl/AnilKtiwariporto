import type { ResumeData, ResumeField } from "./store";

const SESSION_KEY = "shell_session_token";

export function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function storeToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(SESSION_KEY, token);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable (private mode, etc.) — session just won't persist across reloads */
  }
}

export async function login(password: string): Promise<string> {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `login failed (${res.status})`);
  }
  const { token } = await res.json();
  return token as string;
}

export async function fetchOverrides(): Promise<Partial<ResumeData>> {
  const res = await fetch("/api/resume-data");
  if (!res.ok) return {};
  const body = await res.json().catch(() => ({}));
  return (body?.overrides ?? {}) as Partial<ResumeData>;
}

export async function saveField<K extends ResumeField>(
  token: string,
  field: K,
  value: ResumeData[K]
): Promise<void> {
  const res = await fetch("/api/resume-data", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ [field]: value }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `save failed (${res.status})`);
  }
}

export async function resetFieldRemote(token: string, field: ResumeField): Promise<void> {
  const res = await fetch(`/api/resume-data?field=${encodeURIComponent(field)}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `reset failed (${res.status})`);
  }
}
