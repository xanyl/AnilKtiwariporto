export type LineKind = "out" | "dim" | "accent" | "err" | "input" | "art";

export interface Line {
  kind: LineKind;
  text: string;
}

export const out = (text = ""): Line => ({ kind: "out", text });
export const dim = (text = ""): Line => ({ kind: "dim", text });
export const accent = (text = ""): Line => ({ kind: "accent", text });
export const err = (text = ""): Line => ({ kind: "err", text });
export const art = (text = ""): Line => ({ kind: "art", text });

export interface EditRequest {
  path: string;
  initialText: string;
  onSave: (text: string) => Promise<void> | void;
}

export interface CommandContext {
  print: (lines: Line[]) => void;
  clear: () => void;
  close: () => void;
  setTheme: (t: "dark" | "light") => void;
  theme: "dark" | "light";
  cwd: string[];
  setCwd: (path: string[]) => void;
  loggedIn: boolean;
  login: (password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
  requestEdit: (req: EditRequest) => void;
  resetRemote: (field: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  fetchAuditLog: () => Promise<{ ok: true; log: AuditEntry[] } | { ok: false; error: string }>;
  history: string[];
  bootedAt: number;
}

export interface AuditEntry {
  field: string;
  action: "set" | "reset";
  at: string;
  ip: string;
}

export interface Command {
  name: string;
  summary: string;
  usage?: string;
  /** Completions for the first argument, aware of the current directory. */
  args?: (cwd: string[]) => string[];
  run: (argv: string[], ctx: CommandContext) => Line[] | void | Promise<Line[] | void>;
}
