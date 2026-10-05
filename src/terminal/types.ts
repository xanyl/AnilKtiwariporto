import type { ResumeField } from "../data/store";

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
  /** Set when the file is backed by live resume data, so the terminal can sync it to the server. */
  field?: ResumeField;
  onSave: (text: string) => Promise<void> | void;
}

/** Mutable per-terminal shell state: survives across commands, lost on reload like a real session. */
export interface Session {
  cwd: string[];
  oldpwd: string[] | null;
  /** Variables set with `export` or `NAME=value`; computed ones (USER, HOME, PWD...) are derived on read. */
  env: Record<string, string>;
  aliases: Record<string, string>;
  /** Exit status of the last command, readable as `$?`. */
  status: number;
}

export interface CommandContext {
  print: (lines: Line[]) => void;
  /** Lines piped in from the previous stage, or null when stdin is the terminal. */
  stdin: string[] | null;
  /** True when stdout goes to a pipe or file rather than the screen (so `ls` prints one name per line). */
  piped: boolean;
  /** Marks the running command as failed (non-zero exit status). */
  fail: (code?: number) => void;
  session: Session;
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
  /** Pushes the current value of a resume field to the live site (and GitHub). */
  persistField: (field: ResumeField) => Promise<void>;
  resetRemote: (field: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  fetchAuditLog: () => Promise<{ ok: true; log: AuditEntry[] } | { ok: false; error: string }>;
  history: string[];
  bootedAt: number;
  postWall: (
    name: string,
    message: string
  ) => Promise<{ ok: true; entry: WallEntry } | { ok: false; error: string }>;
  fetchWall: () => Promise<{ ok: true; entries: WallEntry[] } | { ok: false; error: string }>;
  deleteWall: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  deleteAllWall: () => Promise<{ ok: true; count: number } | { ok: false; error: string }>;
}

export interface WallEntry {
  id: string;
  name: string;
  message: string;
  at: string;
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
  /** Completions for the argument being typed; defaults to filesystem paths. */
  args?: (cwd: string[], loggedIn: boolean) => string[];
  run: (argv: string[], ctx: CommandContext) => Line[] | void | Promise<Line[] | void>;
}
