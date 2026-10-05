import { safeHref } from "../data/sanitize";
import { getField } from "../data/store";
import type { ResumeField } from "../data/store";
import { getWallHandle, setWallHandle } from "./wallHandle";
import { envList } from "./env";
import type { Command, CommandContext, Line } from "./types";
import { accent, art, dim, err, out } from "./types";
import {
  bootTime,
  completePath,
  containsLocked,
  E,
  fieldIsCustomized,
  FsError,
  HOSTNAME_STR,
  homeOf,
  lookup,
  makeDir,
  normalize,
  pathStr,
  registerBinaries,
  removeNode,
  resetResumeFile,
  resolve,
  RESUME_FILE_NAMES,
  resumeFieldOf,
  setMode,
  userOf,
  walk,
  writeFile,
} from "./vfs";
import type { VNode } from "./vfs";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "unexpected error");

function relativeTime(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Wraps prose to a column so long bullets stay readable in the terminal. */
function wrap(text: string, width = 76, indent = ""): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > width) {
      lines.push(indent + line.trim());
      line = w;
    } else {
      line += " " + w;
    }
  }
  if (line.trim()) lines.push(indent + line.trim());
  return lines;
}

const bullets = (items: string[]) =>
  items.flatMap((b) => wrap(b, 74, "    ").map((l, i) => out(i === 0 ? "  -" + l.slice(3) : l)));

// --- small shell utilities -------------------------------------------------

const auth = (ctx: CommandContext) => ({ loggedIn: ctx.loggedIn });
const toPath = (ctx: CommandContext, arg: string) => normalize(ctx.cwd, arg);

/** Splits `-la`-style short flags and `--long` flags from operands; `--` ends flag parsing. */
function parseArgs(argv: string[]): { flags: Set<string>; operands: string[] } {
  const flags = new Set<string>();
  const operands: string[] = [];
  let done = false;
  for (const a of argv) {
    if (done) operands.push(a);
    else if (a === "--") done = true;
    else if (a.startsWith("--") && a.length > 2) flags.add(a);
    else if (a.startsWith("-") && a.length > 1 && !/^-\d/.test(a)) for (const c of a.slice(1)) flags.add(c);
    else operands.push(a);
  }
  return { flags, operands };
}

const linesOf = (text: string): string[] => {
  if (text === "") return [];
  const l = text.split("\n");
  if (l[l.length - 1] === "") l.pop();
  return l;
};

interface Input {
  name: string;
  lines: string[];
}

/** Resolves a text command's inputs: named files, or piped stdin when none are given. */
function gatherInputs(cmd: string, files: string[], ctx: CommandContext): { inputs: Input[]; errors: Line[] } {
  const inputs: Input[] = [];
  const errors: Line[] = [];
  if (files.length === 0) {
    if (ctx.stdin) inputs.push({ name: "-", lines: ctx.stdin });
    return { inputs, errors };
  }
  for (const f of files) {
    if (f === "-" && ctx.stdin) {
      inputs.push({ name: "-", lines: ctx.stdin });
      continue;
    }
    try {
      const node = lookup(toPath(ctx, f), auth(ctx));
      if (node.kind === "dir") throw new FsError(E.EISDIR);
      inputs.push({ name: f, lines: linesOf(node.read()) });
    } catch (e) {
      errors.push(err(`${cmd}: ${f}: ${errMsg(e)}`));
    }
  }
  if (errors.length) ctx.fail(1);
  return { inputs, errors };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad2 = (n: number) => String(n).padStart(2, "0");

function modeString(node: VNode): string {
  const rwx = (bits: number) => `${bits & 4 ? "r" : "-"}${bits & 2 ? "w" : "-"}${bits & 1 ? "x" : "-"}`;
  return (node.kind === "dir" ? "d" : "-") + rwx(node.mode >> 6) + rwx((node.mode >> 3) & 7) + rwx(node.mode & 7);
}

function sizeOf(node: VNode): number {
  return node.kind === "dir" ? 4096 : node.size();
}

function human(n: number): string {
  if (n < 1024) return String(n);
  const units = ["K", "M", "G"];
  let v = n / 1024;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u += 1;
  }
  return `${v < 10 ? v.toFixed(1) : Math.ceil(v)}${units[u]}`;
}

function lsDate(ms: number): string {
  const d = new Date(ms);
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function strftime(d: Date, fmt: string): string {
  const tz =
    new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
      .formatToParts(d)
      .find((p) => p.type === "timeZoneName")?.value ?? "UTC";
  const map: Record<string, string> = {
    Y: String(d.getFullYear()),
    m: pad2(d.getMonth() + 1),
    d: pad2(d.getDate()),
    e: String(d.getDate()).padStart(2),
    H: pad2(d.getHours()),
    M: pad2(d.getMinutes()),
    S: pad2(d.getSeconds()),
    a: DAYS[d.getDay()],
    b: MONTHS[d.getMonth()],
    Z: tz,
    s: String(Math.floor(d.getTime() / 1000)),
    F: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    T: `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`,
    "%": "%",
  };
  return fmt.replace(/%(.)/g, (m, c: string) => map[c] ?? m);
}

function unescapeEcho(s: string): string {
  return s.replace(/\\([nt\\])/g, (_m, c: string) => (c === "n" ? "\n" : c === "t" ? "\t" : "\\"));
}

const asLines = (text: string): Line[] => text.split("\n").map((l) => out(l));

// --- portfolio-specific content -------------------------------------------

const LOGO = [
  "   ___    __ __ _______",
  "  / _ |  / //_// ___/ /",
  " / __ | / ,<  / /  / / ",
  "/_/ |_|/_/|_|/_/  /_/  ",
];

function neofetch(): Line[] {
  const profile = getField("profile");
  const experience = getField("experience");
  const projects = getField("projects");
  const publications = getField("publications");
  const certificates = getField("certificates");
  const education = getField("education")[0];

  const info: [string, string][] = [
    ["user", profile.handle],
    ["title", profile.roles.join(" / ")],
    ["location", profile.location],
    ["school", education ? `${education.school} (${education.degree}, ${education.detail})` : "n/a"],
    ["exp", `${experience.length} roles - ${experience[experience.length - 1]?.start ?? "n/a"} to present`],
    ["projects", String(projects.length)],
    ["papers", String(publications.length)],
    ["certs", String(certificates.length)],
    ["stack", "Airflow - AWS - Spark - PyTorch - Kubernetes"],
    ["email", profile.email],
    ["github", profile.githubLabel],
  ];

  const lines: Line[] = [out()];
  const pad = Math.max(...LOGO.map((l) => l.length)) + 3;
  const rows = Math.max(LOGO.length, info.length);

  for (let i = 0; i < rows; i += 1) {
    const left = (LOGO[i] ?? "").padEnd(pad);
    const entry = info[i];
    if (!entry) {
      lines.push(art(left));
      continue;
    }
    lines.push(art(`${left}${entry[0].padEnd(10)} ${entry[1]}`));
  }
  lines.push(out());
  return lines;
}

function catSection(name: string): Line[] {
  switch (name) {
    case "summary":
      return [out(), ...wrap(getField("summary")).map(out), out()];

    case "experience":
      return [
        out(),
        ...getField("experience").flatMap((j) => [
          accent(`${j.role} @ ${j.org}`),
          dim(`  ${j.start} - ${j.end}   [${j.stack.join(", ")}]`),
          ...bullets(j.bullets),
          out(),
        ]),
      ];

    case "projects":
      return [
        out(),
        ...getField("projects").flatMap((p) => [
          accent(p.name),
          dim(`  ${p.blurb}`),
          dim(`  ${p.metrics.map((m) => `${m.value} ${m.label}`).join("  |  ")}`),
          ...bullets(p.bullets),
          ...(p.repo ? [dim(`  repo: ${p.repo}`)] : []),
          out(),
        ]),
      ];

    case "skills":
      return [
        out(),
        ...getField("skillGroups").flatMap((g) => [
          accent(g.label),
          ...wrap(g.items.join(", "), 74, "  ").map(out),
          out(),
        ]),
      ];

    case "education":
      return [
        out(),
        ...getField("education").map((e) => out(`${e.degree} - ${e.school} (${e.detail})`)),
        out(),
      ];

    case "certifications":
      return [
        out(),
        ...getField("certificates").map((c) => out(`${c.issued.padEnd(10)} ${c.title} - ${c.issuer}`)),
        out(),
      ];

    case "publications":
      return [
        out(),
        ...getField("publications").flatMap((p) => [accent(p.title), dim(`  ${p.venue} - ${p.url}`)]),
        out(),
      ];

    case "contact": {
      const profile = getField("profile");
      return [
        out(),
        out(`email     ${profile.email}`),
        out(`phone     ${profile.phone}`),
        out(`github    ${profile.github}`),
        out(`linkedin  ${profile.linkedin}`),
        out(`location  ${profile.location}`),
        out(),
      ];
    }

    default:
      return [];
  }
}

const SECTIONS = [
  "summary",
  "experience",
  "projects",
  "skills",
  "education",
  "certifications",
  "publications",
  "contact",
];

/** Everything the portfolio-wide search covers, tagged with where it came from. */
function corpus(): [string, string][] {
  const rows: [string, string][] = [["summary", getField("summary")]];
  getField("experience").forEach((j) => {
    rows.push([`experience/${slug(j.org)}`, `${j.role} ${j.org} ${j.stack.join(" ")}`]);
    j.bullets.forEach((b) => rows.push([`experience/${slug(j.org)}`, b]));
  });
  getField("projects").forEach((p) => {
    rows.push([`projects/${slug(p.name)}`, `${p.name} ${p.blurb} ${p.stack.join(" ")}`]);
    p.bullets.forEach((b) => rows.push([`projects/${slug(p.name)}`, b]));
  });
  getField("skillGroups").forEach((g) => rows.push([`skills/${slug(g.label)}`, g.items.join(" ")]));
  getField("certificates").forEach((c) => rows.push(["certifications", `${c.title} ${c.issuer}`]));
  getField("publications").forEach((p) => rows.push(["publications", `${p.title} ${p.venue}`]));
  return rows;
}

function openTargets(): Record<string, string> {
  const profile = getField("profile");
  return {
    github: profile.github,
    linkedin: profile.linkedin,
    resume: profile.resume,
    site: "/",
    ...Object.fromEntries(getField("publications").map((p) => ["paper", p.url])),
    ...Object.fromEntries(
      getField("projects").filter((p) => p.repo).map((p) => [slug(p.name), p.repo as string])
    ),
  };
}

// --- filesystem commands ---------------------------------------------------

function openEditor(cmdName: string, argv: string[], ctx: CommandContext): Line[] {
  const target = argv.find((a) => !a.startsWith("-"));
  if (!target) return [err(`${cmdName}: missing file operand`), dim(`usage: ${cmdName} <path>`)];

  const path = toPath(ctx, target);
  let node: VNode | undefined;
  try {
    node = lookup(path, auth(ctx));
  } catch (e) {
    // Like real nano, a missing file in a writable directory opens an empty buffer.
    if (errMsg(e) !== E.ENOENT) return [err(`${cmdName}: ${target}: ${errMsg(e)}`)];
    const parent = resolve(path.slice(0, -1), auth(ctx));
    if (!parent || parent.kind !== "dir" || !parent.writable) {
      return [err(`${cmdName}: ${target}: ${parent ? E.EACCES : E.ENOENT}`)];
    }
  }
  if (node?.kind === "dir") return [err(`${cmdName}: ${target}: ${E.EISDIR}`)];
  if (node?.tracked && !ctx.loggedIn) {
    return [
      err(`${cmdName}: ${target}: ${E.EACCES}`),
      dim("run `login` first - this file writes to the live site"),
    ];
  }
  if (node && !node.write) return [err(`${cmdName}: ${target}: ${E.EACCES} (read-only file)`)];

  ctx.requestEdit({
    path: pathStr(path),
    initialText: node?.read() ?? "",
    field: node?.kind === "file" ? node.field : undefined,
    onSave: (text) => {
      writeFile(path, text, auth(ctx));
    },
  });
  return [];
}

function lsLine(name: string, node: VNode, sizeWidth: number, humanSizes: boolean, classify: boolean): string {
  const size = humanSizes ? human(sizeOf(node)) : String(sizeOf(node));
  const mark = classify ? (node.kind === "dir" ? "/" : node.mode & 0o111 ? "*" : "") : "";
  const owner = node.owner.padEnd(5);
  return `${modeString(node)} ${node.kind === "dir" ? 2 : 1} ${owner} ${owner} ${size.padStart(sizeWidth)} ${lsDate(
    node.mtime
  )} ${name}${mark}`;
}

function runLs(argv: string[], ctx: CommandContext): Line[] {
  const { flags, operands } = parseArgs(argv);
  const all = flags.has("a");
  const almost = flags.has("A");
  const long = flags.has("l");
  const classify = flags.has("F");
  const humanSizes = flags.has("h");
  const targets = operands.length ? operands : ["."];
  const lines: Line[] = [];
  let customized = false;

  const render = (entries: [string, VNode][]): Line[] => {
    if (long) {
      const sizeWidth = Math.max(
        1,
        ...entries.map(([, n]) => (humanSizes ? human(sizeOf(n)) : String(sizeOf(n))).length)
      );
      return [
        out(`total ${Math.ceil(entries.reduce((s, [, n]) => s + sizeOf(n), 0) / 1024)}`),
        ...entries.map(([name, n]) => out(lsLine(name, n, sizeWidth, humanSizes, classify))),
      ];
    }
    const names = entries.map(([name, n]) => name + (classify && n.kind === "dir" ? "/" : ""));
    if (flags.has("1") || ctx.piped) return names.map((n) => out(n));
    return names.length ? [out(names.join("  "))] : [];
  };

  targets.forEach((target, idx) => {
    const path = toPath(ctx, target);
    let node: VNode;
    try {
      node = lookup(path, auth(ctx));
    } catch (e) {
      lines.push(err(`ls: cannot access '${target}': ${errMsg(e)}`));
      ctx.fail(2);
      return;
    }
    if (node.kind === "file" || flags.has("d")) {
      lines.push(...render([[target, node]]));
      return;
    }
    if (targets.length > 1) lines.push(out(`${idx > 0 ? "\n" : ""}${target}:`));
    const entries: [string, VNode][] = [];
    if (all) {
      entries.push([".", node]);
      entries.push(["..", resolve(path.slice(0, -1), auth(ctx)) ?? node]);
    }
    for (const n of node.list()) {
      if (n.startsWith(".") && !all && !almost) continue;
      const child = node.get(n);
      if (child) {
        entries.push([n, child]);
        if (child.kind === "file" && child.field && fieldIsCustomized(child.field)) customized = true;
      }
    }
    lines.push(...render(entries));
  });

  if (customized) lines.push(dim("(some resume files differ from their defaults - `reset <file>` reverts one)"));
  return lines;
}

function runTree(argv: string[], ctx: CommandContext): Line[] {
  const depthIdx = argv.indexOf("-L");
  const maxDepth = depthIdx !== -1 ? Number(argv[depthIdx + 1]) || Infinity : Infinity;
  const rest = argv.filter((_a, i) => depthIdx === -1 || (i !== depthIdx && i !== depthIdx + 1));
  const { flags, operands } = parseArgs(rest);
  const target = operands[0] ?? ".";
  let root: VNode;
  try {
    root = lookup(toPath(ctx, target), auth(ctx));
  } catch (e) {
    ctx.fail(2);
    return [err(`tree: ${target}: ${errMsg(e)}`)];
  }
  if (root.kind !== "dir") return [out(target), out(), out("0 directories, 1 file")];

  const lines: Line[] = [out(target)];
  let dirs = 0;
  let files = 0;
  const visit = (dir: VNode, prefix: string, depth: number) => {
    if (dir.kind !== "dir" || depth >= maxDepth) return;
    const names = dir.list().filter((n) => flags.has("a") || !n.startsWith("."));
    names.forEach((n, i) => {
      const child = dir.get(n) as VNode;
      const last = i === names.length - 1;
      lines.push(out(`${prefix}${last ? "└── " : "├── "}${n}`));
      if (child.kind === "dir") {
        dirs += 1;
        visit(child, prefix + (last ? "    " : "│   "), depth + 1);
      } else {
        files += 1;
      }
    });
  };
  visit(root, "", 0);
  lines.push(out(), out(`${dirs} director${dirs === 1 ? "y" : "ies"}, ${files} file${files === 1 ? "" : "s"}`));
  return lines;
}

function runFind(argv: string[], ctx: CommandContext): Line[] {
  const starts: string[] = [];
  let name: RegExp | null = null;
  let type: string | null = null;
  let maxdepth = Infinity;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "-name" || a === "-iname") {
      const pat = argv[(i += 1)] ?? "";
      const re = pat
        .split("")
        .map((c) => (c === "*" ? ".*" : c === "?" ? "." : c.replace(/[.+^${}()|[\]\\]/g, "\\$&")))
        .join("");
      name = new RegExp(`^${re}$`, a === "-iname" ? "i" : "");
    } else if (a === "-type") type = argv[(i += 1)] ?? null;
    else if (a === "-maxdepth") maxdepth = Number(argv[(i += 1)]);
    else if (!a.startsWith("-")) starts.push(a);
  }
  const lines: Line[] = [];
  for (const start of starts.length ? starts : ["."]) {
    try {
      const base = toPath(ctx, start);
      const shown = start.replace(/\/+$/, "") || "/";
      for (const { path, node } of walk(base, auth(ctx), maxdepth)) {
        const rel = path.slice(base.length);
        const display = rel.length ? `${shown === "/" ? "" : shown}/${rel.join("/")}` : shown;
        const leaf = rel.length ? rel[rel.length - 1] : (base[base.length - 1] ?? "/");
        if (name && !name.test(leaf)) continue;
        if (type === "f" && node.kind !== "file") continue;
        if (type === "d" && node.kind !== "dir") continue;
        lines.push(out(display));
      }
    } catch (e) {
      lines.push(err(`find: '${start}': ${errMsg(e)}`));
      ctx.fail(1);
    }
  }
  return lines;
}

function runDu(argv: string[], ctx: CommandContext): Line[] {
  const { flags, operands } = parseArgs(argv);
  const lines: Line[] = [];
  const fmt = (n: number) => (flags.has("h") ? human(n) : String(Math.ceil(n / 1024)));
  const total = (shown: string, node: VNode): number => {
    if (node.kind === "file") return Math.ceil(Math.max(node.size(), 1) / 4096) * 4096;
    let sum = 4096;
    for (const n of node.list()) sum += total(`${shown}/${n}`, node.get(n) as VNode);
    if (!flags.has("s")) lines.push(out(`${fmt(sum)}\t${shown}`));
    return sum;
  };
  for (const target of operands.length ? operands : ["."]) {
    try {
      const node = lookup(toPath(ctx, target), auth(ctx));
      const sum = total(target, node);
      if (flags.has("s") || node.kind === "file") lines.push(out(`${fmt(sum)}\t${target}`));
    } catch (e) {
      lines.push(err(`du: cannot access '${target}': ${errMsg(e)}`));
      ctx.fail(1);
    }
  }
  return lines;
}

function destinationFor(ctx: CommandContext, src: string, dst: string): string[] {
  const dstPath = toPath(ctx, dst);
  const existing = resolve(dstPath, auth(ctx));
  if (existing?.kind === "dir") return [...dstPath, src.split("/").filter(Boolean).pop() ?? src];
  return dstPath;
}

/** Copies a node (recursively for directories), collecting resume fields that need syncing. */
function copyTree(
  srcPath: string[],
  dstPath: string[],
  ctx: CommandContext,
  recursive: boolean,
  fields: Set<ResumeField>
) {
  const node = lookup(srcPath, auth(ctx));
  if (node.kind === "file") {
    const field = writeFile(dstPath, node.read(), auth(ctx));
    if (field) fields.add(field);
    return;
  }
  if (!recursive) throw new FsError("-r not specified; omitting directory");
  if (!resolve(dstPath, auth(ctx))) makeDir(dstPath, auth(ctx));
  for (const n of node.list()) copyTree([...srcPath, n], [...dstPath, n], ctx, recursive, fields);
}

async function copyOrMove(name: "cp" | "mv", argv: string[], ctx: CommandContext): Promise<Line[]> {
  const { flags, operands } = parseArgs(argv);
  if (operands.length < 2) {
    ctx.fail(1);
    return [err(operands.length ? `${name}: missing destination file operand after '${operands[0]}'` : `${name}: missing file operand`)];
  }
  const dst = operands[operands.length - 1];
  const sources = operands.slice(0, -1);
  const dstNode = resolve(toPath(ctx, dst), auth(ctx));
  if (sources.length > 1 && dstNode?.kind !== "dir") {
    ctx.fail(1);
    return [err(`${name}: target '${dst}' is not a directory`)];
  }
  const lines: Line[] = [];
  const fields = new Set<ResumeField>();
  for (const src of sources) {
    try {
      const srcPath = toPath(ctx, src);
      const target = destinationFor(ctx, src, dst);
      const node = lookup(srcPath, auth(ctx));
      if (name === "mv" && containsLocked(node)) throw new FsError(E.EACCES);
      if (pathStr(target).startsWith(pathStr(srcPath) + "/")) {
        throw new FsError("cannot copy a directory into itself");
      }
      copyTree(srcPath, target, ctx, name === "mv" || flags.has("r") || flags.has("R"), fields);
      if (name === "mv") removeNode(srcPath, auth(ctx), { recursive: true });
    } catch (e) {
      lines.push(err(`${name}: cannot ${name === "cp" ? "copy" : "move"} '${src}' to '${dst}': ${errMsg(e)}`));
      ctx.fail(1);
    }
  }
  for (const f of fields) await ctx.persistField(f);
  return lines;
}

function applyChmod(spec: string, current: number): number | null {
  if (/^[0-7]{3,4}$/.test(spec)) return parseInt(spec, 8) & 0o7777;
  const m = /^([ugoa]*)([+\-=])([rwx]+)$/.exec(spec);
  if (!m) return null;
  const who = m[1] || "a";
  const bits = [...m[3]].reduce((n, c) => n | (c === "r" ? 4 : c === "w" ? 2 : 1), 0);
  let mask = 0;
  let add = 0;
  for (const w of who === "a" ? "ugo" : who) {
    const shift = w === "u" ? 6 : w === "g" ? 3 : 0;
    mask |= 7 << shift;
    add |= bits << shift;
  }
  if (m[2] === "+") return current | add;
  if (m[2] === "-") return current & ~add;
  return (current & ~mask) | add;
}

function fileType(name: string, node: VNode): string {
  if (node.kind === "dir") return "directory";
  const text = node.read();
  if (text === "") return "empty";
  if (name.endsWith(".json")) return "JSON text data";
  if (text.startsWith("#!")) return "a /bin/portfolio-shell script, ASCII text executable";
  return "ASCII text";
}

/** Parses head/tail's `-n N`, `-nN` and `-N` count forms. */
function parseCount(argv: string[]): { n: number; files: string[] } {
  let n = 10;
  const files: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "-n") n = Math.max(0, parseInt(argv[(i += 1)] ?? "10", 10) || 0);
    else if (/^-n\d+$/.test(a)) n = parseInt(a.slice(2), 10);
    else if (/^-\d+$/.test(a)) n = parseInt(a.slice(1), 10);
    else files.push(a);
  }
  return { n, files };
}

// --- the command table -----------------------------------------------------

export const commands: Command[] = [
  {
    name: "help",
    summary: "List available commands",
    run: () => [
      out(),
      accent("Portfolio shell - available commands"),
      ...commands.map((c) => out(`  ${c.name.padEnd(12)} ${c.summary}`)),
      out(),
      dim("  Tab completes - Up/Down recalls history - Esc closes the terminal"),
      dim("  a real shell: pipes (|), redirects (>, >>), && || ;, $VARS, quotes, globs"),
      dim("  your resume lives in ~/resume (also /var/www/resume) - `login` to edit it"),
      dim("  `man <command>` for details - `wall <message>` signs the guestbook"),
      out(),
    ],
  },
  {
    name: "neofetch",
    summary: "Profile summary card",
    run: neofetch,
  },
  {
    name: "about",
    summary: "Short bio",
    run: () => {
      const profile = getField("profile");
      return [
        out(),
        accent(profile.name),
        out(profile.roles.join(" / ")),
        dim(`${profile.location} - ${profile.email}`),
        out(),
        ...wrap(getField("summary")).map(out),
        out(),
      ];
    },
  },
  {
    name: "whoami",
    summary: "Print the current user name",
    run: (_argv, ctx) => [out(userOf(ctx.loggedIn))],
  },
  {
    name: "id",
    summary: "Print user identity",
    run: (_argv, ctx) => [
      out(
        ctx.loggedIn
          ? "uid=0(root) gid=0(root) groups=0(root)"
          : "uid=1000(guest) gid=1000(guest) groups=1000(guest)"
      ),
    ],
  },
  {
    name: "groups",
    summary: "Print group memberships",
    run: (_argv, ctx) => [out(userOf(ctx.loggedIn))],
  },
  {
    name: "who",
    summary: "Show who is logged in",
    run: (_argv, ctx) => [
      out(`${userOf(ctx.loggedIn).padEnd(8)} pts/0        ${strftime(new Date(ctx.bootedAt), "%F %H:%M")}`),
    ],
  },
  {
    name: "hostname",
    summary: "Print the host name",
    run: () => [out(HOSTNAME_STR)],
  },
  {
    name: "date",
    summary: "Show the current date and time",
    usage: "date [+FORMAT]",
    args: () => ["+%F", "+%T", "+%s"],
    run: (argv) => {
      const fmt = argv.find((a) => a.startsWith("+"));
      return [out(strftime(new Date(), fmt ? fmt.slice(1) : "%a %b %e %H:%M:%S %Z %Y"))];
    },
  },
  {
    name: "uptime",
    summary: "Show how long this shell session has been up",
    run: (_argv, ctx) => {
      const seconds = Math.max(0, Math.round((Date.now() - ctx.bootedAt) / 1000));
      const m = Math.floor(seconds / 60);
      const up = m < 60 ? `${m} min` : `${Math.floor(m / 60)}:${pad2(m % 60)}`;
      return [out(` ${strftime(new Date(), "%T")} up ${up},  1 user,  load average: 0.42, 0.31, 0.27`)];
    },
  },
  {
    name: "uname",
    summary: "Print system information",
    usage: "uname [-asrmno]",
    args: () => ["-a", "-s", "-r", "-m", "-n", "-o"],
    run: (argv) => {
      const { flags } = parseArgs(argv);
      const parts = {
        s: "Linux",
        n: HOSTNAME_STR,
        r: "6.6.0-portfolio",
        v: "#1 SMP PREEMPT_DYNAMIC",
        m: "x86_64",
        o: "GNU/Linux",
      };
      if (flags.has("a")) return [out(`${parts.s} ${parts.n} ${parts.r} ${parts.v} ${parts.m} ${parts.o}`)];
      const picked = (["s", "n", "r", "m", "o"] as const).filter((k) => flags.has(k)).map((k) => parts[k]);
      return [out(picked.length ? picked.join(" ") : parts.s)];
    },
  },
  {
    name: "ps",
    summary: "List processes",
    usage: "ps [aux]",
    args: () => ["aux"],
    run: (argv, ctx) => {
      const start = strftime(new Date(bootTime()), "%H:%M");
      const user = userOf(ctx.loggedIn);
      if (argv.some((a) => a.includes("a") || a.includes("u"))) {
        return [
          out("USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND"),
          out(`root           1  0.0  0.1  16984  3216 ?        Ss   ${start}   0:00 /sbin/init`),
          out(`root          21  0.0  0.3  48120  6104 ?        Ss   ${start}   0:00 portfolio-shell --serve`),
          out(`${user.padEnd(8)}     120  0.0  0.2  22108  4300 pts/0    Ss   ${start}   0:00 -zsh`),
          out(`${user.padEnd(8)}     142  0.0  0.1  12408  2012 pts/0    R+   ${strftime(new Date(), "%H:%M")}   0:00 ps ${argv.join(" ")}`),
        ];
      }
      return [
        out("    PID TTY          TIME CMD"),
        out("    120 pts/0    00:00:00 zsh"),
        out("    142 pts/0    00:00:00 ps"),
      ];
    },
  },
  {
    name: "df",
    summary: "Report filesystem disk space",
    usage: "df [-h]",
    run: () => [
      out("Filesystem      Size  Used Avail Use% Mounted on"),
      out("overlay          59G   18G   38G  32% /"),
      out("tmpfs            64M     0   64M   0% /dev"),
      out("tmpfs           3.9G     0  3.9G   0% /tmp"),
      out("/dev/vda1       59G   18G   38G  32% /var/www"),
    ],
  },
  {
    name: "free",
    summary: "Display memory usage",
    usage: "free [-h]",
    run: () => [
      out("               total        used        free      shared  buff/cache   available"),
      out("Mem:           7.7Gi       1.2Gi       5.0Gi        12Mi       1.5Gi       6.3Gi"),
      out("Swap:             0B          0B          0B"),
    ],
  },
  {
    name: "env",
    summary: "Print environment variables",
    run: (_argv, ctx) => envList(ctx.session, ctx.loggedIn).map(([k, v]) => out(`${k}=${v}`)),
  },
  {
    name: "printenv",
    summary: "Print one or all environment variables",
    usage: "printenv [NAME]",
    run: (argv, ctx) => {
      const all = envList(ctx.session, ctx.loggedIn);
      if (!argv[0]) return all.map(([k, v]) => out(`${k}=${v}`));
      const hit = all.find(([k]) => k === argv[0]);
      if (!hit) {
        ctx.fail(1);
        return [];
      }
      return [out(hit[1])];
    },
  },
  {
    name: "export",
    summary: "Set an environment variable",
    usage: "export NAME=value",
    run: (argv, ctx) => {
      if (argv.length === 0) return envList(ctx.session, ctx.loggedIn).map(([k, v]) => out(`declare -x ${k}="${v}"`));
      for (const a of argv) {
        const eq = a.indexOf("=");
        if (eq === -1) continue;
        const key = a.slice(0, eq);
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
          ctx.fail(1);
          return [err(`export: not a valid identifier: ${key}`)];
        }
        ctx.session.env[key] = a.slice(eq + 1);
      }
    },
  },
  {
    name: "unset",
    summary: "Remove an environment variable",
    usage: "unset NAME",
    run: (argv, ctx) => {
      for (const k of argv) delete ctx.session.env[k];
    },
  },
  {
    name: "alias",
    summary: "Define or list command aliases",
    usage: "alias [name='command']",
    run: (argv, ctx) => {
      if (argv.length === 0) return Object.entries(ctx.session.aliases).map(([k, v]) => out(`alias ${k}='${v}'`));
      const lines: Line[] = [];
      for (const a of argv) {
        const eq = a.indexOf("=");
        if (eq === -1) {
          const v = ctx.session.aliases[a];
          if (v === undefined) {
            lines.push(err(`alias: ${a}: not found`));
            ctx.fail(1);
          } else lines.push(out(`alias ${a}='${v}'`));
        } else {
          ctx.session.aliases[a.slice(0, eq)] = a.slice(eq + 1);
        }
      }
      return lines;
    },
  },
  {
    name: "unalias",
    summary: "Remove an alias",
    usage: "unalias name",
    run: (argv, ctx) => {
      for (const a of argv) {
        if (!(a in ctx.session.aliases)) {
          ctx.fail(1);
          return [err(`unalias: no such hash table element: ${a}`)];
        }
        delete ctx.session.aliases[a];
      }
    },
  },
  {
    name: "history",
    summary: "Show recent command history",
    run: (_argv, ctx) => [...ctx.history].reverse().map((cmd, i) => out(`${String(i + 1).padStart(5)}  ${cmd}`)),
  },
  {
    name: "man",
    summary: "Show usage for a command",
    usage: "man <command>",
    args: () => commandNames,
    run: (argv, ctx) => {
      const name = argv[0];
      if (!name) {
        ctx.fail(1);
        return [err("What manual page do you want?"), dim("For example, try 'man man'.")];
      }
      const cmd = findCommand(name.toLowerCase());
      if (!cmd) {
        ctx.fail(16);
        return [err(`No manual entry for ${name}`)];
      }
      return [
        out(),
        accent(`${cmd.name.toUpperCase()}(1)`),
        out(),
        dim("NAME"),
        out(`  ${cmd.name} - ${cmd.summary}`),
        ...(cmd.usage ? [out(), dim("SYNOPSIS"), out(`  ${cmd.usage}`)] : []),
        out(),
      ];
    },
  },
  {
    name: "which",
    summary: "Locate a command",
    usage: "which <command>",
    args: () => commandNames,
    run: (argv, ctx) =>
      argv.flatMap((n) => {
        const alias = ctx.session.aliases[n];
        if (alias !== undefined) return [out(`${n}: aliased to ${alias}`)];
        if (findCommand(n)) return [out(`/usr/bin/${n}`)];
        ctx.fail(1);
        return [err(`${n} not found`)];
      }),
  },
  {
    name: "type",
    summary: "Describe how a command name resolves",
    usage: "type <command>",
    args: () => commandNames,
    run: (argv, ctx) =>
      argv.flatMap((n) => {
        const alias = ctx.session.aliases[n];
        if (alias !== undefined) return [out(`${n} is an alias for ${alias}`)];
        if (findCommand(n)) return [out(`${n} is /usr/bin/${n}`)];
        ctx.fail(1);
        return [err(`type: ${n}: not found`)];
      }),
  },
  {
    name: "pwd",
    summary: "Print working directory",
    run: (_argv, ctx) => [out(pathStr(ctx.cwd))],
  },
  {
    name: "cd",
    summary: "Change directory",
    usage: "cd [dir]",
    run: (argv, ctx) => {
      const arg = argv[0];
      let next: string[];
      let echoed = false;
      if (arg === undefined) next = homeOf(ctx.loggedIn);
      else if (arg === "-") {
        if (!ctx.session.oldpwd) {
          ctx.fail(1);
          return [err("cd: OLDPWD not set")];
        }
        next = ctx.session.oldpwd;
        echoed = true;
      } else next = toPath(ctx, arg);

      try {
        const node = lookup(next, auth(ctx));
        if (node.kind !== "dir") throw new FsError(E.ENOTDIR);
      } catch (e) {
        ctx.fail(1);
        return [err(`cd: ${arg ?? pathStr(next)}: ${errMsg(e)}`)];
      }
      ctx.session.oldpwd = ctx.cwd;
      ctx.setCwd(next);
      if (echoed) return [out(pathStr(next))];
    },
  },
  {
    name: "ls",
    summary: "List directory contents",
    usage: "ls [-alAhF1] [path...]",
    run: (argv, ctx) => runLs(argv, ctx),
  },
  {
    name: "tree",
    summary: "List directory contents as a tree",
    usage: "tree [-a] [-L depth] [path]",
    run: (argv, ctx) => runTree(argv, ctx),
  },
  {
    name: "find",
    summary: "Search for files in a directory tree",
    usage: "find [path] [-name pattern] [-type f|d] [-maxdepth n]",
    run: (argv, ctx) => runFind(argv, ctx),
  },
  {
    name: "du",
    summary: "Estimate file space usage",
    usage: "du [-sh] [path...]",
    run: (argv, ctx) => runDu(argv, ctx),
  },
  {
    name: "stat",
    summary: "Display file status",
    usage: "stat <file>",
    run: (argv, ctx) =>
      argv.flatMap((f) => {
        try {
          const node = lookup(toPath(ctx, f), auth(ctx));
          const size = sizeOf(node);
          return [
            out(`  File: ${f}`),
            out(
              `  Size: ${String(size).padEnd(10)} Blocks: ${Math.ceil(size / 512)}   IO Block: 4096   ${
                node.kind === "dir" ? "directory" : "regular file"
              }`
            ),
            out(
              `Access: (${(node.mode & 0o777).toString(8).padStart(4, "0")}/${modeString(node)})  Uid: (${
                node.owner === "root" ? "    0/    root" : " 1000/   guest"
              })`
            ),
            out(`Modify: ${strftime(new Date(node.mtime), "%F %T")}`),
          ];
        } catch (e) {
          ctx.fail(1);
          return [err(`stat: cannot stat '${f}': ${errMsg(e)}`)];
        }
      }),
  },
  {
    name: "file",
    summary: "Determine file type",
    usage: "file <path>",
    run: (argv, ctx) =>
      argv.flatMap((f) => {
        try {
          return [out(`${f}: ${fileType(f, lookup(toPath(ctx, f), auth(ctx)))}`)];
        } catch (e) {
          ctx.fail(1);
          return [err(`${f}: cannot open (${errMsg(e)})`)];
        }
      }),
  },
  {
    name: "cat",
    summary: "Concatenate and print files",
    usage: "cat [-n] [file...]",
    run: (argv, ctx) => {
      const { flags, operands } = parseArgs(argv);
      // Friendly extra: `cat summary` renders the formatted section when no such file exists.
      if (
        operands.length === 1 &&
        SECTIONS.includes(operands[0].toLowerCase()) &&
        !resolve(toPath(ctx, operands[0]), auth(ctx))
      ) {
        return catSection(operands[0].toLowerCase());
      }
      const { inputs, errors } = gatherInputs("cat", operands, ctx);
      let n = 0;
      const body = inputs.flatMap((i) =>
        i.lines.map((l) => (flags.has("n") ? out(`${String(++n).padStart(6)}\t${l}`) : out(l)))
      );
      return [...errors, ...body];
    },
  },
  {
    name: "less",
    summary: "Page through a file (prints it in full)",
    usage: "less <file>",
    run: (argv, ctx) => {
      const { inputs, errors } = gatherInputs("less", argv.filter((a) => !a.startsWith("-")), ctx);
      return [...errors, ...inputs.flatMap((i) => i.lines.map((l) => out(l)))];
    },
  },
  {
    name: "head",
    summary: "Output the first lines of files",
    usage: "head [-n N] [file...]",
    run: (argv, ctx) => {
      const { n, files } = parseCount(argv);
      const { inputs, errors } = gatherInputs("head", files, ctx);
      return [
        ...errors,
        ...inputs.flatMap((i) => [
          ...(inputs.length > 1 ? [out(`==> ${i.name} <==`)] : []),
          ...i.lines.slice(0, n).map((l) => out(l)),
        ]),
      ];
    },
  },
  {
    name: "tail",
    summary: "Output the last lines of files",
    usage: "tail [-n N] [file...]",
    run: (argv, ctx) => {
      const { n, files } = parseCount(argv);
      const { inputs, errors } = gatherInputs("tail", files, ctx);
      return [
        ...errors,
        ...inputs.flatMap((i) => [
          ...(inputs.length > 1 ? [out(`==> ${i.name} <==`)] : []),
          ...(n === 0 ? [] : i.lines.slice(-n)).map((l) => out(l)),
        ]),
      ];
    },
  },
  {
    name: "wc",
    summary: "Count lines, words and characters",
    usage: "wc [-lwc] [file...]",
    run: (argv, ctx) => {
      const { flags, operands } = parseArgs(argv);
      const { inputs, errors } = gatherInputs("wc", operands, ctx);
      const any = flags.has("l") || flags.has("w") || flags.has("c");
      const cols = [flags.has("l") || !any, flags.has("w") || !any, flags.has("c") || !any];
      const rows = inputs.map((i) => {
        const text = i.lines.join("\n") + (i.lines.length ? "\n" : "");
        return { name: i.name, counts: [i.lines.length, text.split(/\s+/).filter(Boolean).length, text.length] };
      });
      const width = Math.max(1, ...rows.flatMap((r) => r.counts.map((c) => String(c).length)));
      const lines = rows.map((r) => {
        const nums = r.counts.filter((_c, idx) => cols[idx]);
        const text =
          nums.length === 1 && operands.length === 0
            ? String(nums[0])
            : nums.map((c) => String(c).padStart(width)).join(" ");
        return out(r.name === "-" ? text : `${text} ${r.name}`);
      });
      return [...errors, ...lines];
    },
  },
  {
    name: "sort",
    summary: "Sort lines of text",
    usage: "sort [-rnu] [file...]",
    run: (argv, ctx) => {
      const { flags, operands } = parseArgs(argv);
      const { inputs, errors } = gatherInputs("sort", operands, ctx);
      let lines = inputs.flatMap((i) => i.lines);
      lines = flags.has("n")
        ? [...lines].sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0))
        : [...lines].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      if (flags.has("r")) lines.reverse();
      if (flags.has("u")) lines = lines.filter((l, i) => i === 0 || l !== lines[i - 1]);
      return [...errors, ...lines.map((l) => out(l))];
    },
  },
  {
    name: "uniq",
    summary: "Report or omit repeated adjacent lines",
    usage: "uniq [-c] [file]",
    run: (argv, ctx) => {
      const { flags, operands } = parseArgs(argv);
      const { inputs, errors } = gatherInputs("uniq", operands, ctx);
      const rows: [string, number][] = [];
      for (const l of inputs.flatMap((i) => i.lines)) {
        const last = rows[rows.length - 1];
        if (last && last[0] === l) last[1] += 1;
        else rows.push([l, 1]);
      }
      return [...errors, ...rows.map(([l, c]) => out(flags.has("c") ? `${String(c).padStart(7)} ${l}` : l))];
    },
  },
  {
    name: "tee",
    summary: "Copy input to files and to the output",
    usage: "tee [-a] file...",
    run: async (argv, ctx) => {
      const { flags, operands } = parseArgs(argv);
      const input = ctx.stdin ?? [];
      const text = input.join("\n") + (input.length ? "\n" : "");
      const lines: Line[] = [];
      for (const f of operands) {
        try {
          const field = writeFile(toPath(ctx, f), text, auth(ctx), flags.has("a"));
          if (field) await ctx.persistField(field);
        } catch (e) {
          lines.push(err(`tee: ${f}: ${errMsg(e)}`));
          ctx.fail(1);
        }
      }
      return [...lines, ...input.map((l) => out(l))];
    },
  },
  {
    name: "echo",
    summary: "Print text",
    usage: "echo [-ne] [text...]",
    run: (argv) => {
      let rest = argv;
      let interpret = false;
      while (rest[0] && /^-[neE]+$/.test(rest[0])) {
        if (rest[0].includes("e")) interpret = true;
        rest = rest.slice(1);
      }
      const text = rest.join(" ");
      return asLines(interpret ? unescapeEcho(text) : text);
    },
  },
  {
    name: "printf",
    summary: "Format and print text",
    usage: "printf FORMAT [args...]",
    run: (argv) => {
      const [fmt = "", ...args] = argv;
      let result = "";
      let next = 0;
      do {
        result += unescapeEcho(fmt).replace(/%([sd%])/g, (_m, c: string) => {
          if (c === "%") return "%";
          const v = args[next++] ?? "";
          return c === "d" ? String(parseInt(v, 10) || 0) : v;
        });
      } while (next < args.length && /%[sd]/.test(fmt));
      return asLines(result.endsWith("\n") ? result.slice(0, -1) : result);
    },
  },
  {
    name: "seq",
    summary: "Print a sequence of numbers",
    usage: "seq [first [step]] last",
    run: (argv, ctx) => {
      const nums = argv.map(Number);
      if (nums.length === 0 || nums.some(Number.isNaN)) {
        ctx.fail(1);
        return [err("seq: invalid argument")];
      }
      const [first, step, last] =
        nums.length === 1 ? [1, 1, nums[0]] : nums.length === 2 ? [nums[0], 1, nums[1]] : nums;
      if (step === 0) {
        ctx.fail(1);
        return [err("seq: invalid zero increment")];
      }
      const lines: Line[] = [];
      for (let v = first; step > 0 ? v <= last : v >= last; v += step) {
        lines.push(out(String(v)));
        if (lines.length > 10000) break;
      }
      return lines;
    },
  },
  {
    name: "basename",
    summary: "Strip directory from a path",
    usage: "basename <path>",
    run: (argv) => [out((argv[0] ?? "").replace(/\/+$/, "").split("/").pop() || "/")],
  },
  {
    name: "dirname",
    summary: "Strip the last component from a path",
    usage: "dirname <path>",
    run: (argv) => {
      const parts = (argv[0] ?? "").replace(/\/+$/, "").split("/");
      parts.pop();
      return [out(parts.join("/") || (argv[0]?.startsWith("/") ? "/" : "."))];
    },
  },
  {
    name: "realpath",
    summary: "Print the resolved absolute path",
    usage: "realpath <path>",
    run: (argv, ctx) => argv.map((a) => out(pathStr(toPath(ctx, a)))),
  },
  {
    name: "sleep",
    summary: "Delay for a number of seconds (max 10)",
    usage: "sleep <seconds>",
    args: () => [],
    run: async (argv, ctx) => {
      const s = Number(argv[0]);
      if (!Number.isFinite(s) || s < 0) {
        ctx.fail(1);
        return [err("sleep: invalid time interval")];
      }
      await new Promise((r) => setTimeout(r, Math.min(s, 10) * 1000));
    },
  },
  {
    name: "true",
    summary: "Do nothing, successfully",
    args: () => [],
    run: () => undefined,
  },
  {
    name: "false",
    summary: "Do nothing, unsuccessfully",
    args: () => [],
    run: (_argv, ctx) => {
      ctx.fail(1);
    },
  },
  {
    name: "nano",
    summary: "Edit a file (requires login for resume files)",
    usage: "nano <path>",
    run: (argv, ctx) => openEditor("nano", argv, ctx),
  },
  {
    name: "vi",
    summary: "Alias for nano",
    usage: "vi <path>",
    run: (argv, ctx) => openEditor("vi", argv, ctx),
  },
  {
    name: "vim",
    summary: "Alias for nano",
    usage: "vim <path>",
    run: (argv, ctx) => openEditor("vim", argv, ctx),
  },
  {
    name: "edit",
    summary: "Alias for nano",
    usage: "edit <path>",
    run: (argv, ctx) => openEditor("edit", argv, ctx),
  },
  {
    name: "touch",
    summary: "Create an empty file or update its timestamp",
    usage: "touch <file...>",
    run: (argv, ctx) => {
      const files = argv.filter((a) => !a.startsWith("-"));
      if (files.length === 0) {
        ctx.fail(1);
        return [err("touch: missing file operand")];
      }
      const lines: Line[] = [];
      for (const f of files) {
        try {
          const path = toPath(ctx, f);
          const existing = resolve(path, auth(ctx));
          if (existing) {
            if (!existing.locked) existing.mtime = Date.now();
          } else {
            writeFile(path, "", auth(ctx));
          }
        } catch (e) {
          lines.push(err(`touch: cannot touch '${f}': ${errMsg(e)}`));
          ctx.fail(1);
        }
      }
      return lines;
    },
  },
  {
    name: "mkdir",
    summary: "Make directories",
    usage: "mkdir [-p] <dir...>",
    run: (argv, ctx) => {
      const { flags, operands } = parseArgs(argv);
      if (operands.length === 0) {
        ctx.fail(1);
        return [err("mkdir: missing operand")];
      }
      const lines: Line[] = [];
      for (const d of operands) {
        try {
          makeDir(toPath(ctx, d), auth(ctx), flags.has("p"));
        } catch (e) {
          lines.push(err(`mkdir: cannot create directory '${d}': ${errMsg(e)}`));
          ctx.fail(1);
        }
      }
      return lines;
    },
  },
  {
    name: "rmdir",
    summary: "Remove empty directories",
    usage: "rmdir <dir...>",
    run: (argv, ctx) => {
      const lines: Line[] = [];
      for (const d of argv) {
        try {
          removeNode(toPath(ctx, d), auth(ctx), { dirOnly: true });
        } catch (e) {
          lines.push(err(`rmdir: failed to remove '${d}': ${errMsg(e)}`));
          ctx.fail(1);
        }
      }
      return lines;
    },
  },
  {
    name: "rm",
    summary: "Remove files or directories",
    usage: "rm [-rf] <file...>",
    run: (argv, ctx) => {
      const { flags, operands } = parseArgs(argv);
      if (operands.length === 0 && !flags.has("f")) {
        ctx.fail(1);
        return [err("rm: missing operand")];
      }
      const recursive = flags.has("r") || flags.has("R");
      const lines: Line[] = [];
      for (const f of operands) {
        const path = toPath(ctx, f);
        if (path.length === 0 && recursive) {
          lines.push(err("rm: it is dangerous to operate recursively on '/'"));
          ctx.fail(1);
          continue;
        }
        try {
          removeNode(path, auth(ctx), { recursive });
        } catch (e) {
          if (flags.has("f") && errMsg(e) === E.ENOENT) continue;
          lines.push(err(`rm: cannot remove '${f}': ${errMsg(e)}`));
          ctx.fail(1);
        }
      }
      return lines;
    },
  },
  {
    name: "cp",
    summary: "Copy files and directories",
    usage: "cp [-r] <source...> <dest>",
    run: (argv, ctx) => copyOrMove("cp", argv, ctx),
  },
  {
    name: "mv",
    summary: "Move or rename files",
    usage: "mv <source...> <dest>",
    run: (argv, ctx) => copyOrMove("mv", argv, ctx),
  },
  {
    name: "chmod",
    summary: "Change file mode bits",
    usage: "chmod <mode> <file...>",
    run: (argv, ctx) => {
      const [spec, ...files] = argv;
      if (!spec || files.length === 0) {
        ctx.fail(1);
        return [err("chmod: missing operand"), dim("usage: chmod <mode> <file...>")];
      }
      const lines: Line[] = [];
      for (const f of files) {
        try {
          const path = toPath(ctx, f);
          const mode = applyChmod(spec, lookup(path, auth(ctx)).mode);
          if (mode === null) {
            ctx.fail(1);
            return [err(`chmod: invalid mode: '${spec}'`)];
          }
          setMode(path, auth(ctx), mode);
        } catch (e) {
          lines.push(err(`chmod: changing permissions of '${f}': ${errMsg(e)}`));
          ctx.fail(1);
        }
      }
      return lines;
    },
  },
  {
    name: "grep",
    summary: "Search for a pattern in files (or the whole portfolio)",
    usage: "grep [-invclrwEF] <pattern> [file...]",
    run: (argv, ctx) => {
      const { flags, operands } = parseArgs(argv);
      const [pattern, ...files] = operands;
      if (!pattern) {
        ctx.fail(2);
        return [err("grep: missing pattern"), dim("usage: grep [-inrv] <pattern> [file...]")];
      }
      const recursive = flags.has("r") || flags.has("R");

      // No files and nothing piped: search the whole portfolio, like a site-wide `grep`.
      if (files.length === 0 && !ctx.stdin && !recursive) {
        const q = pattern.toLowerCase();
        const hits = corpus().filter(([, text]) => text.toLowerCase().includes(q));
        if (hits.length === 0) {
          ctx.fail(1);
          return [];
        }
        const lines: Line[] = [];
        const seen = new Set<string>();
        for (const [where, text] of hits) {
          const key = where + text.slice(0, 40);
          if (seen.has(key)) continue;
          seen.add(key);
          const i = text.toLowerCase().indexOf(q);
          lines.push(accent(where), out(`  ...${text.slice(Math.max(0, i - 30), i + 60).trim()}...`));
        }
        return lines;
      }

      let re: RegExp;
      try {
        const src = flags.has("F") ? pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : pattern;
        re = new RegExp(flags.has("w") ? `\\b(?:${src})\\b` : src, flags.has("i") ? "i" : "");
      } catch {
        ctx.fail(2);
        return [err(`grep: invalid regular expression: ${pattern}`)];
      }

      const targets: Input[] = [];
      const lines: Line[] = [];
      const sources = files.length ? files : recursive ? ["."] : [];
      if (sources.length === 0 && ctx.stdin) targets.push({ name: "(standard input)", lines: ctx.stdin });
      for (const f of sources) {
        if (f === "-" && ctx.stdin) {
          targets.push({ name: "(standard input)", lines: ctx.stdin });
          continue;
        }
        try {
          const base = toPath(ctx, f);
          for (const { path, node } of walk(base, auth(ctx), recursive ? Infinity : 0)) {
            if (node.kind === "dir") {
              if (!recursive) lines.push(err(`grep: ${f}: ${E.EISDIR}`));
              continue;
            }
            const rel = path.slice(base.length);
            targets.push({
              name: rel.length ? `${f.replace(/\/+$/, "")}/${rel.join("/")}` : f,
              lines: linesOf(node.read()),
            });
          }
        } catch (e) {
          lines.push(err(`grep: ${f}: ${errMsg(e)}`));
          ctx.fail(2);
        }
      }

      const prefixNames = targets.length > 1 || recursive;
      let matched = false;
      for (const t of targets) {
        const hits: [number, string][] = [];
        t.lines.forEach((l, i) => {
          if (re.test(l) !== flags.has("v")) hits.push([i + 1, l]);
        });
        if (hits.length) matched = true;
        if (flags.has("q")) continue;
        if (flags.has("l")) {
          if (hits.length) lines.push(out(t.name));
        } else if (flags.has("c")) {
          lines.push(out(prefixNames ? `${t.name}:${hits.length}` : String(hits.length)));
        } else {
          for (const [n, l] of hits) {
            lines.push(out(`${prefixNames ? `${t.name}:` : ""}${flags.has("n") ? `${n}:` : ""}${l}`));
          }
        }
      }
      if (!matched) ctx.fail(1);
      return lines;
    },
  },
  {
    name: "reset",
    summary: "Revert a resume file to its default content",
    usage: "reset <file>",
    args: () => RESUME_FILE_NAMES,
    run: async (argv, ctx) => {
      if (!ctx.loggedIn) {
        ctx.fail(1);
        return [err("reset: permission denied"), dim("run `login` first")];
      }
      const name = argv[0]?.split("/").pop();
      if (!name) {
        ctx.fail(1);
        return [err("reset: missing operand"), dim("usage: reset <file>")];
      }
      const field = resumeFieldOf(name);
      if (!field) {
        ctx.fail(1);
        return [err(`reset: ${name}: not a resume file`)];
      }
      resetResumeFile(name);
      const remote = await ctx.resetRemote(field);
      if (!remote.ok) ctx.fail(1);
      return remote.ok
        ? [dim(`${name} reverted to default and synced`)]
        : [dim(`${name} reverted locally`), err(`sync failed: ${remote.error}`)];
    },
  },
  {
    name: "log",
    summary: "Show recent edits to the live site",
    run: async (_argv, ctx) => {
      if (!ctx.loggedIn) {
        ctx.fail(1);
        return [err("log: permission denied"), dim("run `login` first")];
      }
      const result = await ctx.fetchAuditLog();
      if (!result.ok) {
        ctx.fail(1);
        return [err(`log: ${result.error}`)];
      }
      if (result.log.length === 0) return [dim("no edits recorded yet")];
      return result.log.map((e) => out(`${e.at}  ${e.action.padEnd(5)} ${e.field.padEnd(14)} from ${e.ip}`));
    },
  },
  {
    name: "wall",
    summary: "Read or sign the guestbook",
    usage:
      "wall [message] | wall --as <name> [message] | wall --delete <id> | wall --delete all --yes",
    args: () => ["--as", "--delete"],
    run: async (argv, ctx) => {
      if (argv[0] === "--delete" || argv[0] === "-d") {
        if (!ctx.loggedIn) {
          ctx.fail(1);
          return [err("wall: permission denied"), dim("run `login` first")];
        }

        if (argv[1] === "all") {
          if (argv[2] !== "--yes") {
            ctx.fail(1);
            return [
              err("wall: this deletes every guestbook entry, permanently"),
              dim("re-run as `wall --delete all --yes` to confirm"),
            ];
          }
          const result = await ctx.deleteAllWall();
          if (!result.ok) ctx.fail(1);
          return result.ok
            ? [dim(`deleted all ${result.count} guestbook entries`)]
            : [err(`wall: ${result.error}`)];
        }

        const id = argv[1];
        if (!id) {
          ctx.fail(1);
          return [err("wall: missing id"), dim("usage: wall --delete <id>")];
        }
        const result = await ctx.deleteWall(id);
        if (!result.ok) ctx.fail(1);
        return result.ok ? [dim(`deleted ${id}`)] : [err(`wall: ${result.error}`)];
      }

      let name = getWallHandle();
      let rest = argv;
      if (argv[0] === "--as") {
        const newName = argv[1];
        if (!newName) {
          ctx.fail(1);
          return [err("wall: --as needs a name"), dim("usage: wall --as <name> [message]")];
        }
        name = newName;
        setWallHandle(name);
        rest = argv.slice(2);
      }

      const message = rest.join(" ").trim();

      if (!message) {
        const result = await ctx.fetchWall();
        if (!result.ok) {
          ctx.fail(1);
          return [err(`wall: ${result.error}`)];
        }
        if (result.entries.length === 0) {
          return [out(), dim("the wall is empty - be the first: wall <message>"), out()];
        }
        return [
          out(),
          ...result.entries.slice(0, 20).flatMap((e) => [
            accent(`${e.name}  ·  ${relativeTime(e.at)}`),
            out(`  ${e.message}`),
            ...(ctx.loggedIn ? [dim(`  id: ${e.id}`)] : []),
          ]),
          out(),
          dim(`signed in as ${name} - change with \`wall --as <name>\``),
          ...(ctx.loggedIn
            ? [dim("logged in - `wall --delete <id>` removes one, `wall --delete all --yes` clears the board")]
            : []),
          out(),
        ];
      }

      const result = await ctx.postWall(name, message);
      if (!result.ok) ctx.fail(1);
      return result.ok ? [dim(`posted to the wall as ${name}`)] : [err(`wall: ${result.error}`)];
    },
  },
  {
    name: "open",
    summary: "Open a link in a new tab",
    usage: "open <target>",
    args: () => Object.keys(openTargets()),
    run: (argv, ctx) => {
      const targets = openTargets();
      const key = (argv[0] ?? "").toLowerCase();
      const url = targets[key];
      if (!url) {
        ctx.fail(1);
        return [
          err(`open: unknown target "${argv[0] ?? ""}"`),
          dim(`targets: ${Object.keys(targets).join(", ")}`),
        ];
      }
      window.open(safeHref(url), "_blank", "noopener");
      return [dim(`opening ${url}`)];
    },
  },
  {
    name: "resume",
    summary: "Download the PDF resume",
    run: () => {
      const a = document.createElement("a");
      a.href = safeHref(getField("profile").resume);
      a.download = "Anil_Kumar_Tiwari_Resume.pdf";
      a.click();
      return [dim("downloading Resume_Anil.pdf ...")];
    },
  },
  {
    name: "login",
    summary: "Authenticate to edit the live site",
    usage: "login <password>",
    args: () => [],
    run: async (argv, ctx) => {
      const password = argv.join(" ");
      if (!password) {
        ctx.fail(1);
        return [err("login: missing password"), dim("usage: login <password>")];
      }
      const result = await ctx.login(password);
      if (!result.ok) ctx.fail(1);
      return result.ok
        ? [dim("authenticated - you are now root; resume files are writable for this session")]
        : [err(`login: ${result.error}`)];
    },
  },
  {
    name: "logout",
    summary: "End the authenticated session",
    run: (_argv, ctx) => {
      ctx.logout();
      return [dim("logged out")];
    },
  },
  {
    name: "theme",
    summary: "Switch theme",
    usage: "theme <dark|light>",
    args: () => ["dark", "light"],
    run: (argv, ctx) => {
      const next = (argv[0] ?? (ctx.theme === "dark" ? "light" : "dark")).toLowerCase();
      if (next !== "dark" && next !== "light") {
        ctx.fail(1);
        return [err(`theme: expected dark or light`)];
      }
      ctx.setTheme(next);
      return [dim(`theme -> ${next}`)];
    },
  },
  {
    name: "clear",
    summary: "Clear the screen",
    args: () => [],
    run: (_argv, ctx) => {
      ctx.clear();
    },
  },
  {
    name: "exit",
    summary: "Close the terminal",
    args: () => [],
    run: (_argv, ctx) => {
      ctx.close();
    },
  },
  {
    name: "sudo",
    summary: "Run a command as another user (not available)",
    run: (argv, ctx) => {
      if (ctx.loggedIn) return [dim("you are already root - just run the command")];
      ctx.fail(1);
      return [
        err(`${getField("profile").handle} is not in the sudoers file.`),
        dim(argv.length ? `This incident (${argv.join(" ")}) has been reported.` : "This incident has been reported."),
      ];
    },
  },
];

export const commandNames = commands.map((c) => c.name);
export function findCommand(name: string) {
  return commands.find((c) => c.name === name);
}

registerBinaries(commandNames);

/** Tab-completion candidates for the argument being typed. */
export function completeArgument(cmdName: string, partial: string, cwd: string[], loggedIn: boolean): string[] {
  const cmd = findCommand(cmdName.toLowerCase());
  if (cmd?.args) return cmd.args(cwd, loggedIn).filter((o) => o.startsWith(partial));
  return completePath(cwd, partial, { loggedIn }, homeOf(loggedIn));
}
