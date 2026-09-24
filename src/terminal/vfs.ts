import { getField, isOverridden, RESUME_FIELDS, resetField, setField } from "../data/store";
import type { ResumeField } from "../data/store";

export interface VFile {
  kind: "file";
  /** true if this file is backed by live resume data (edits persist to the site). */
  tracked: boolean;
  read: () => string;
  write?: (text: string) => void;
  size: () => number;
}

export interface VDir {
  kind: "dir";
  list: () => string[];
  get: (name: string) => VNode | undefined;
}

export type VNode = VFile | VDir;

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
    read,
    write: (text: string) => {
      if (field === "summary") {
        setField("summary", text.trim());
        return;
      }
      const parsed = JSON.parse(text);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setField(field, parsed as any);
    },
    size: () => read().length,
  };
}

/** Ephemeral scratch filesystem for realism (mkdir/touch/rm) — resets on reload, never touches the site. */
const scratch = new Map<string, string>();

const scratchDir: VDir = {
  kind: "dir",
  list: () => [...scratch.keys()].sort(),
  get: (name) =>
    scratch.has(name)
      ? {
          kind: "file",
          tracked: false,
          read: () => scratch.get(name) ?? "",
          write: (text) => void scratch.set(name, text),
          size: () => (scratch.get(name) ?? "").length,
        }
      : undefined,
};

export function scratchTouch(name: string) {
  if (!scratch.has(name)) scratch.set(name, "");
}
export function scratchWrite(name: string, text: string) {
  scratch.set(name, text);
}
export function scratchRemove(name: string): boolean {
  return scratch.delete(name);
}

const resumeDir: VDir = {
  kind: "dir",
  list: () => Object.keys(RESUME_FILES),
  get: (name) => {
    const field = RESUME_FILES[name];
    return field ? resumeFile(field) : undefined;
  },
};

const root: VDir = {
  kind: "dir",
  list: () => ["resume", "scratch"],
  get: (name) => (name === "resume" ? resumeDir : name === "scratch" ? scratchDir : undefined),
};

/** Splits an absolute path like "/resume/summary.txt" into segments, resolving . and .. */
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

export function resolve(path: string[]): VNode | undefined {
  let node: VNode = root;
  for (const seg of path) {
    if (node.kind !== "dir") return undefined;
    const next = node.get(seg);
    if (!next) return undefined;
    node = next;
  }
  return node;
}

export function pathStr(path: string[]): string {
  return "/" + path.join("/");
}

export function fieldIsCustomized(field: ResumeField): boolean {
  return isOverridden(field);
}

export function resetResumeFile(name: string): boolean {
  const field = RESUME_FILES[name];
  if (!field) return false;
  resetField(field);
  return true;
}

export const RESUME_FIELD_NAMES = RESUME_FIELDS;
