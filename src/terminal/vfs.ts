import { RESUME_FIELD_SCHEMAS } from "../../netlify/functions/lib/schema.mts";
import { getField, isOverridden, RESUME_FIELDS, resetField, setField } from "../data/store";
import type { ResumeField } from "../data/store";

/** Linux-style errno messages, so commands can print `cmd: path: <message>` exactly like coreutils. */
export class FsError extends Error {}
export const E = {
  ENOENT: "No such file or directory",
  EACCES: "Permission denied",
  EISDIR: "Is a directory",
  ENOTDIR: "Not a directory",
  EEXIST: "File exists",
  ENOTEMPTY: "Directory not empty",
  EPERM: "Operation not permitted",
} as const;
const fail = (msg: string): never => {
  throw new FsError(msg);
};

export interface VFile {
  kind: "file";
  /** true if this file is backed by live resume data (edits persist to the site). */
  tracked: boolean;
  field?: ResumeField;
  owner: string;
  mode: number;
  mtime: number;
  /** System files can't be chmod'ed or removed. */
  locked?: boolean;
  read: () => string;
  write?: (text: string) => void;
  size: () => number;
}

export interface VDir {
  kind: "dir";
  owner: string;
  mode: number;
  mtime: number;
  locked?: boolean;
  /** Whether entries can be created or removed in this directory. */
  writable: boolean;
  list: () => string[];
  get: (name: string) => VNode | undefined;
  add?: (name: string, node: VNode) => void;
  remove?: (name: string) => boolean;
}

export type VNode = VFile | VDir;

export interface Auth {
  loggedIn: boolean;
}

/** Fixed timestamp for "installed with the system" files, so `ls -l` looks like a real box. */
const BUILD_TIME = Date.UTC(2026, 0, 12, 9, 30);
const BOOT_TIME = Date.now();

class MemDir implements VDir {
  kind = "dir" as const;
  mtime: number;
  private kids = new Map<string, VNode>();
  constructor(
    public writable = false,
    public owner = "root",
    public mode = 0o755,
    public locked = !writable
  ) {
    this.mtime = writable ? BOOT_TIME : BUILD_TIME;
  }
  list() {
    return [...this.kids.keys()].sort();
  }
  get(name: string) {
    return this.kids.get(name);
  }
  add(name: string, node: VNode) {
    this.kids.set(name, node);
    this.mtime = Date.now();
  }
  remove(name: string) {
    const removed = this.kids.delete(name);
    if (removed) this.mtime = Date.now();
    return removed;
  }
}

function memFile(
  text: string,
  o: { owner?: string; mode?: number; writable?: boolean; mtime?: number; onWrite?: (t: string) => void } = {}
): VFile {
  let content = text;
  const writable = o.writable !== false;
  const file: VFile = {
    kind: "file",
    tracked: false,
    owner: o.owner ?? "guest",
    mode: o.mode ?? 0o644,
    mtime: o.mtime ?? Date.now(),
    locked: !writable,
    read: () => content,
    size: () => content.length,
  };
  if (writable) {
    file.write = (t) => {
      content = o.onWrite ? (o.onWrite(t), "") : t;
      file.mtime = Date.now();
    };
  }
  return file;
}

const sysFile = (text: string) => memFile(text, { owner: "root", writable: false, mtime: BUILD_TIME });
const dynFile = (read: () => string): VFile => ({
  kind: "file",
  tracked: false,
  owner: "root",
  mode: 0o444,
  mtime: BUILD_TIME,
  locked: true,
  read,
  size: () => 0,
});

function dirOf(entries: Record<string, VNode>, writable = false, owner = "root", mode = 0o755): MemDir {
  const d = new MemDir(writable, owner, mode);
  for (const [name, node] of Object.entries(entries)) d.add(name, node);
  d.mtime = writable ? BOOT_TIME : BUILD_TIME;
  return d;
}

// --- live resume data ------------------------------------------------------

const RESUME_FILES: Record<string, ResumeField> = {
  "profile.json": "profile",
  "summary.txt": "summary",
  "experience.json": "experience",
  "projects.json": "projects",
  "skills.json": "skillGroups",
  "education.json": "education",
  "certificates.json": "certificates",
  "publications.json": "publications",
};

function resumeFile(field: ResumeField): VFile {
  const read = () => {
    const value = getField(field);
    return typeof value === "string" ? value : JSON.stringify(value, null, 2);
  };
  return {
    kind: "file",
    tracked: true,
    field,
    owner: "root",
    mode: 0o644,
    mtime: BOOT_TIME,
    locked: true,
    read,
    write: (text: string) => {
      let value: unknown = text.trim();
      if (field !== "summary") {
        try {
          value = JSON.parse(text);
        } catch (e) {
          return fail(`invalid JSON: ${e instanceof Error ? e.message : "parse error"}`);
        }
      }
      // Same schema the server enforces — a bad edit must never reach the renderer.
      const parsed = RESUME_FIELD_SCHEMAS[field].safeParse(value);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const where = issue?.path.join(".") || "value";
        return fail(`invalid ${field}: ${where}: ${issue?.message ?? "bad shape"}`);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setField(field, parsed.data as any);
    },
    size: () => read().length,
  };
}

const resumeDir: VDir = {
  kind: "dir",
  owner: "root",
  mode: 0o755,
  mtime: BOOT_TIME,
  locked: true,
  writable: false,
  list: () => Object.keys(RESUME_FILES),
  get: (name) => {
    const field = RESUME_FILES[name];
    return field ? resumeFile(field) : undefined;
  },
};

// --- the tree --------------------------------------------------------------

const usrBin = new MemDir();
/** Called by the command table so /usr/bin lists (and `which` finds) every real command. */
export function registerBinaries(names: string[]) {
  for (const n of names) usrBin.add(n, memFile("#!/bin/portfolio-shell\n", { owner: "root", mode: 0o755, writable: false, mtime: BUILD_TIME }));
}

const HOSTNAME = "portfolio";
const OS_RELEASE = [
  'PRETTY_NAME="Portfolio OS 1.0 (react-terminal)"',
  'NAME="Portfolio OS"',
  'VERSION_ID="1.0"',
  'VERSION="1.0 (Vite)"',
  "ID=portfolio",
  "ID_LIKE=debian",
  'HOME_URL="https://tiwarianil.com.np/"',
  "",
].join("\n");

const README = [
  "# Welcome to the portfolio shell",
  "",
  "This is a small Linux-like environment running in your browser.",
  "",
  "  resume/       live resume data - `login` to edit it with nano",
  "  /tmp          scratch space (cleared on reload)",
  "",
  "Try: ls -la, cat resume/summary.txt, grep -ri airflow resume, tree, neofetch",
  "",
].join("\n");

const zshrc = [
  "# ~/.zshrc",
  "alias ll='ls -alF'",
  "alias la='ls -A'",
  "alias l='ls -CF'",
  "export EDITOR=nano",
  "",
].join("\n");

const meminfo = () =>
  ["MemTotal:        8040276 kB", "MemFree:         5231044 kB", "MemAvailable:    6580120 kB", ""].join("\n");

function userHome(name: string, writable = true) {
  return dirOf(
    {
      ".zshrc": memFile(zshrc, { owner: name }),
      "README.md": memFile(README, { owner: name }),
      resume: resumeDir,
    },
    writable,
    name,
    0o750
  );
}

const devNull = memFile("", { owner: "root", mode: 0o666, onWrite: () => undefined });
devNull.locked = true;

const root = dirOf({
  bin: usrBin,
  sbin: usrBin,
  usr: dirOf({ bin: usrBin, lib: dirOf({}), share: dirOf({}) }),
  etc: dirOf({
    hostname: sysFile(`${HOSTNAME}\n`),
    "os-release": sysFile(OS_RELEASE),
    issue: sysFile("Portfolio OS 1.0 \\n \\l\n"),
    motd: sysFile("Welcome to Portfolio OS. Type `help` to get started.\n"),
    hosts: sysFile(`127.0.0.1\tlocalhost\n127.0.1.1\t${HOSTNAME}\n`),
    passwd: sysFile(
      "root:x:0:0:root:/root:/bin/zsh\nguest:x:1000:1000:Guest:/home/guest:/bin/zsh\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\n"
    ),
    group: sysFile("root:x:0:\nguest:x:1000:\nwww-data:x:33:\n"),
    shells: sysFile("/bin/sh\n/bin/zsh\n"),
  }),
  home: dirOf({ guest: userHome("guest") }),
  root: userHome("root"),
  tmp: dirOf({}, true, "root", 0o777),
  var: dirOf({
    log: dirOf({ "portfolio.log": sysFile("portfolio-shell: ready\n") }),
    tmp: dirOf({}, true, "root", 0o777),
    www: dirOf({ resume: resumeDir }),
  }),
  proc: dirOf({
    version: dynFile(() => "Linux version 6.6.0-portfolio (build@portfolio) (gcc 12.2.0) #1 SMP PREEMPT_DYNAMIC\n"),
    uptime: dynFile(() => `${((Date.now() - BOOT_TIME) / 1000).toFixed(2)} ${((Date.now() - BOOT_TIME) / 1000).toFixed(2)}\n`),
    loadavg: dynFile(() => "0.42 0.31 0.27 1/118 4242\n"),
    meminfo: dynFile(meminfo),
    cpuinfo: dynFile(
      () =>
        `processor\t: 0\nmodel name\t: Virtual Portfolio CPU @ 3.00GHz\ncpu cores\t: ${
          (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 4
        }\n`
    ),
  }),
  dev: dirOf({ null: devNull }),
  opt: dirOf({}),
  srv: dirOf({}),
  mnt: dirOf({}),
});

export const HOSTNAME_STR = HOSTNAME;
export const bootTime = () => BOOT_TIME;

// --- path helpers ----------------------------------------------------------

export const homeOf = (loggedIn: boolean): string[] => (loggedIn ? ["root"] : ["home", "guest"]);
export const userOf = (loggedIn: boolean) => (loggedIn ? "root" : "guest");

/** Splits a path into segments relative to cwd, resolving "." and "..". */
export function normalize(cwd: string[], input: string): string[] {
  const parts = input.startsWith("/") ? input.split("/") : [...cwd, ...input.split("/")];
  const stack: string[] = [];
  for (const p of parts) {
    if (p === "" || p === ".") continue;
    if (p === "..") stack.pop();
    else stack.push(p);
  }
  return stack;
}

export function pathStr(path: string[]): string {
  return "/" + path.join("/");
}

/** `~`-abbreviated path for the prompt. */
export function displayPath(path: string[], home: string[]): string {
  const inHome = home.every((seg, i) => path[i] === seg);
  if (inHome) {
    const rest = path.slice(home.length);
    return rest.length ? `~/${rest.join("/")}` : "~";
  }
  return pathStr(path);
}

/** Expands a leading `~` the way a shell does. */
export function expandTilde(arg: string, home: string[]): string {
  if (arg === "~") return pathStr(home);
  if (arg.startsWith("~/")) return pathStr(home) + arg.slice(1);
  return arg;
}

// --- operations ------------------------------------------------------------

export function lookup(path: string[], auth: Auth): VNode {
  let node: VNode = root;
  for (let i = 0; i < path.length; i += 1) {
    if (node.kind !== "dir") return fail(E.ENOTDIR);
    if (i === 0 && path[0] === "root" && !auth.loggedIn) return fail(E.EACCES);
    const next = node.get(path[i]);
    if (!next) return fail(E.ENOENT);
    node = next;
  }
  return node;
}

/** Non-throwing lookup for completion and checks. */
export function resolve(path: string[], auth: Auth = { loggedIn: true }): VNode | undefined {
  try {
    return lookup(path, auth);
  } catch {
    return undefined;
  }
}

function parentDir(path: string[], auth: Auth): VDir {
  const parent = lookup(path.slice(0, -1), auth);
  if (parent.kind !== "dir") return fail(E.ENOTDIR);
  return parent;
}

/** Returns the resume field if the write hit tracked site data (so the caller can sync it). */
export function writeFile(path: string[], text: string, auth: Auth, append = false): ResumeField | undefined {
  if (path.length === 0) return fail(E.EISDIR);
  const name = path[path.length - 1];
  const parent = parentDir(path, auth);
  const existing = parent.get(name);

  if (existing) {
    if (existing.kind === "dir") return fail(E.EISDIR);
    if (existing.tracked && !auth.loggedIn) return fail(E.EACCES);
    if (!existing.write) return fail(E.EACCES);
    existing.write(append ? existing.read() + text : text);
    return existing.field;
  }
  if (!parent.writable || !parent.add) return fail(E.EACCES);
  const file = memFile(text, { owner: userOf(auth.loggedIn) });
  parent.add(name, file);
  return undefined;
}

export function makeDir(path: string[], auth: Auth, parents = false): void {
  if (path.length === 0) return fail(E.EEXIST);
  if (parents) {
    for (let i = 1; i <= path.length; i += 1) {
      const sub = path.slice(0, i);
      const found = resolve(sub, auth);
      if (found) {
        if (found.kind !== "dir") return fail(E.ENOTDIR);
        continue;
      }
      makeDir(sub, auth, false);
    }
    return;
  }
  const parent = parentDir(path, auth);
  const name = path[path.length - 1];
  if (parent.get(name)) return fail(E.EEXIST);
  if (!parent.writable || !parent.add) return fail(E.EACCES);
  parent.add(name, new MemDir(true, userOf(auth.loggedIn), 0o755, false));
}

export function containsLocked(node: VNode): boolean {
  if (node.locked || (node.kind === "file" && node.tracked)) return true;
  if (node.kind === "dir") return node.list().some((n) => containsLocked(node.get(n) as VNode));
  return false;
}

export function removeNode(path: string[], auth: Auth, opts: { recursive?: boolean; dirOnly?: boolean } = {}): void {
  if (path.length === 0) return fail(E.EPERM);
  const name = path[path.length - 1];
  const parent = parentDir(path, auth);
  const node = parent.get(name);
  if (!node) return fail(E.ENOENT);
  if (!parent.writable || !parent.remove || containsLocked(node)) return fail(E.EACCES);
  if (node.kind === "dir") {
    if (opts.dirOnly) {
      if (node.list().length) return fail(E.ENOTEMPTY);
    } else if (!opts.recursive) {
      return fail(E.EISDIR);
    }
  } else if (opts.dirOnly) {
    return fail(E.ENOTDIR);
  }
  parent.remove(name);
}

export function setMode(path: string[], auth: Auth, mode: number): void {
  const node = lookup(path, auth);
  if (node.locked || (node.kind === "file" && node.tracked)) return fail(E.EPERM);
  node.mode = mode;
}

/** Depth-first walk including the start node itself. */
export function* walk(path: string[], auth: Auth, maxDepth = Infinity): Generator<{ path: string[]; node: VNode }> {
  const node = lookup(path, auth);
  yield { path, node };
  if (node.kind !== "dir" || maxDepth <= 0) return;
  for (const name of node.list()) {
    if (path.length === 0 && name === "root" && !auth.loggedIn) continue;
    yield* walk([...path, name], auth, maxDepth - 1);
  }
}

/** Single-level glob match supporting * and ?. */
export function globToRegExp(pattern: string): RegExp {
  const src = pattern
    .split("")
    .map((c) => (c === "*" ? ".*" : c === "?" ? "." : c.replace(/[.+^${}()|[\]\\]/g, "\\$&")))
    .join("");
  return new RegExp(`^${src}$`);
}

/** Expands a path-with-wildcards (only in the last segment) into matching paths, like shell globbing. */
export function glob(cwd: string[], arg: string, auth: Auth): string[] {
  const slash = arg.lastIndexOf("/");
  const dirPart = slash === -1 ? "" : arg.slice(0, slash + 1);
  const pattern = arg.slice(slash + 1);
  const dir = resolve(normalize(cwd, dirPart || "."), auth);
  if (!dir || dir.kind !== "dir") return [];
  const re = globToRegExp(pattern);
  return dir
    .list()
    .filter((n) => re.test(n) && (pattern.startsWith(".") || !n.startsWith(".")))
    .map((n) => dirPart + n);
}

/** Path completions for the word being typed, with a trailing slash on directories. */
export function completePath(cwd: string[], partial: string, auth: Auth, home: string[]): string[] {
  const expanded = expandTilde(partial, home);
  const slash = expanded.lastIndexOf("/");
  const dirPart = slash === -1 ? "" : expanded.slice(0, slash + 1);
  const base = expanded.slice(slash + 1);
  const dir = resolve(normalize(cwd, dirPart || "."), auth);
  if (!dir || dir.kind !== "dir") return [];
  const shown = partial.startsWith("~") && slash !== -1 ? partial.slice(0, partial.lastIndexOf("/") + 1) : dirPart;
  return dir
    .list()
    .filter((n) => n.startsWith(base) && (base.startsWith(".") || !n.startsWith(".")))
    .map((n) => {
      const child = dir.get(n);
      return shown + n + (child?.kind === "dir" ? "/" : "");
    });
}

// --- resume bookkeeping used by `ls` and `reset` ----------------------------

export function fieldIsCustomized(field: ResumeField): boolean {
  return isOverridden(field);
}

export function resumeFieldOf(name: string): ResumeField | undefined {
  return RESUME_FILES[name];
}

export function resetResumeFile(name: string): boolean {
  const field = RESUME_FILES[name];
  if (!field) return false;
  resetField(field);
  return true;
}

export const RESUME_FIELD_NAMES = RESUME_FIELDS;
export const RESUME_FILE_NAMES = Object.keys(RESUME_FILES);
