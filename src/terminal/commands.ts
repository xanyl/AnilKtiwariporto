import { safeHref } from "../data/sanitize";
import { getField } from "../data/store";
import { getWallHandle, setWallHandle } from "./wallHandle";
import type { Command, Line } from "./types";
import { accent, art, dim, err, out } from "./types";
import {
  fieldIsCustomized,
  normalize,
  pathStr,
  resetResumeFile,
  resolve,
  scratchRemove,
  scratchTouch,
  scratchWrite,
} from "./vfs";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

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

  const info: [string, string][] = [
    ["user", profile.handle],
    ["title", profile.roles.join(" / ")],
    ["location", profile.location],
    ["school", "Georgia State University (M.S. CS, 2027)"],
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
      return [err(`cat: ${name}: no such section`), dim("try: ls")];
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

/** Everything grep searches, tagged with where it came from. */
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

/** Directory entries at `cwd`, for path-aware tab completion. */
function dirEntries(cwd: string[]): string[] {
  const node = resolve(cwd);
  if (!node || node.kind !== "dir") return [];
  return node.list();
}

function openEditor(cmdName: string, argv: string[], ctx: import("./types").CommandContext): Line[] {
  const target = argv[0];
  if (!target) return [err(`${cmdName}: missing operand`), dim(`usage: ${cmdName} <path>`)];

  const path = normalize(ctx.cwd, target);
  const inScratch = path[0] === "scratch";
  let node = resolve(path);

  if (!node && inScratch && path.length === 2) {
    scratchTouch(path[1]);
    node = resolve(path);
  }
  if (!node) return [err(`${cmdName}: ${target}: no such file`)];
  if (node.kind === "dir") return [err(`${cmdName}: ${target}: is a directory`)];
  if (node.tracked && !ctx.loggedIn) {
    return [
      err(`${cmdName}: permission denied`),
      dim("run `login` first - this file writes to the live site"),
    ];
  }

  const write = node.write;
  ctx.requestEdit({
    path: pathStr(path),
    initialText: node.read(),
    onSave: async (text) => {
      if (inScratch) {
        scratchWrite(path[1], text);
        return;
      }
      if (!write) throw new Error("read-only file");
      write(text);
    },
  });
  return [];
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

export const commands: Command[] = [
  {
    name: "help",
    summary: "List available commands",
    run: () => [
      out(),
      accent("Available commands"),
      ...commands.map((c) => out(`  ${c.name.padEnd(14)} ${c.summary}`)),
      out(),
      dim("  Tab completes - Up/Down recalls history - Esc closes the terminal"),
      dim("  cd/ls/pwd/cat/nano walk a real /resume filesystem - `login` to edit it"),
      dim("  chain commands with `;` or `&&` - `man <command>` for details"),
      dim("  `wall <message>` signs the guestbook - `wall` alone reads it"),
      out(),
    ],
  },
  {
    name: "neofetch",
    summary: "Profile summary card",
    run: neofetch,
  },
  {
    name: "whoami",
    summary: "Who is this",
    run: (_argv, ctx) => {
      const profile = getField("profile");
      if (ctx.loggedIn) {
        return [out(), accent("root"), dim("authenticated - write access to /resume"), out()];
      }
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
    name: "date",
    summary: "Show the current date and time",
    run: () => [out(new Date().toString())],
  },
  {
    name: "uptime",
    summary: "Show how long this shell session has been open",
    run: (_argv, ctx) => {
      const seconds = Math.max(0, Math.round((Date.now() - ctx.bootedAt) / 1000));
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return [out(`up ${m}m ${s}s, 1 user, load average: 0.42, 0.31, 0.27`)];
    },
  },
  {
    name: "uname",
    summary: "Print system information",
    usage: "uname [-a]",
    args: () => ["-a"],
    run: (argv) =>
      argv[0] === "-a"
        ? [out("Portfolio 6.6.0-portfolio #1 SMP PREEMPT x86_64 GNU/Linux (react-terminal)")]
        : [out("Portfolio")],
  },
  {
    name: "id",
    summary: "Print effective user identity",
    run: (_argv, ctx) =>
      ctx.loggedIn ? [out("uid=0(root) gid=0(root) groups=0(root)")] : [out("uid=1000(guest) gid=1000(guest) groups=1000(guest)")],
  },
  {
    name: "env",
    summary: "Print environment variables",
    run: (_argv, ctx) => [
      out(`USER=${ctx.loggedIn ? "root" : "guest"}`),
      out("SHELL=/bin/zsh"),
      out("TERM=xterm-256color"),
      out(`HOME=/home/${ctx.loggedIn ? "root" : "guest"}`),
      out("EDITOR=nano"),
      out(`WRITE_ACCESS=${ctx.loggedIn}`),
    ],
  },
  {
    name: "history",
    summary: "Show recent command history",
    run: (_argv, ctx) => {
      const items = [...ctx.history].reverse();
      if (items.length === 0) return [dim("no history yet")];
      return items.map((cmd, i) => out(`  ${String(i + 1).padStart(4)}  ${cmd}`));
    },
  },
  {
    name: "man",
    summary: "Show usage for a command",
    usage: "man <command>",
    args: () => commandNames,
    run: (argv) => {
      const name = argv[0];
      if (!name) return [err("man: missing operand"), dim("usage: man <command>")];
      const cmd = findCommand(name.toLowerCase());
      if (!cmd) return [err(`man: no manual entry for ${name}`)];
      return [
        out(),
        accent(cmd.name.toUpperCase()),
        out(`  ${cmd.summary}`),
        ...(cmd.usage ? [out(), dim("SYNOPSIS"), out(`  ${cmd.usage}`)] : []),
        out(),
      ];
    },
  },
  {
    name: "pwd",
    summary: "Print working directory",
    run: (_argv, ctx) => [out(pathStr(ctx.cwd))],
  },
  {
    name: "cd",
    summary: "Change directory",
    usage: "cd <dir>",
    args: (cwd) => (cwd.length ? ["..", ...dirEntries(cwd)] : dirEntries(cwd)),
    run: (argv, ctx) => {
      const target = argv[0] ?? "/";
      const next = normalize(ctx.cwd, target);
      const node = resolve(next);
      if (!node) return [err(`cd: ${target}: no such directory`)];
      if (node.kind !== "dir") return [err(`cd: ${target}: not a directory`)];
      ctx.setCwd(next);
    },
  },
  {
    name: "ls",
    summary: "List a directory",
    usage: "ls [-la] [path]",
    args: (cwd) => [...dirEntries(cwd), "-la"],
    run: (argv, ctx) => {
      const flags = argv.filter((a) => a.startsWith("-"));
      const target = argv.find((a) => !a.startsWith("-"));
      const path = target ? normalize(ctx.cwd, target) : ctx.cwd;
      const node = resolve(path);
      if (!node) return [err(`ls: ${target ?? pathStr(path)}: no such file or directory`)];

      if (node.kind === "file") {
        return [out(target ?? node.read().length + " bytes")];
      }

      const names = node.list();
      if (!flags.includes("-la") && !flags.includes("-l")) {
        return [out(), out(names.length ? names.join("   ") : "(empty)"), out()];
      }

      const lines: Line[] = [out()];
      for (const name of names) {
        const child = node.get(name);
        if (!child) continue;
        if (child.kind === "dir") {
          lines.push(out(`drwxr-xr-x  ${String(0).padStart(6)}  ${name}/`));
        } else {
          const writable = ctx.loggedIn && child.tracked ? "rw-" : "r--";
          const custom = path.join("/") === "resume" && fieldIsCustomized(RESUME_LOOKUP[name]);
          lines.push(
            out(
              `-rw-${writable}${writable}  ${String(child.size()).padStart(6)}  ${name}${
                custom ? "  *" : ""
              }`
            )
          );
        }
      }
      lines.push(out());
      if (path.join("/") === "resume") lines.push(dim("  * edited from defaults - `reset <file>` to revert"));
      lines.push(out());
      return lines;
    },
  },
  {
    name: "cat",
    summary: "Print a file or resume section",
    usage: "cat <path>",
    args: (cwd) => [...SECTIONS, ...dirEntries(cwd)],
    run: (argv, ctx) => {
      const target = argv[0];
      if (!target) return [err("cat: missing operand"), dim("usage: cat <path>")];

      if (SECTIONS.includes(target.toLowerCase()) && !target.includes("/")) {
        return catSection(target.toLowerCase());
      }

      const path = normalize(ctx.cwd, target);
      const node = resolve(path);
      if (!node) return [err(`cat: ${target}: no such file`)];
      if (node.kind === "dir") return [err(`cat: ${target}: is a directory`)];
      return [out(), ...node.read().split("\n").map(out), out()];
    },
  },
  {
    name: "nano",
    summary: "Edit a file (requires login for /resume)",
    usage: "nano <path>",
    args: (cwd) => dirEntries(cwd),
    run: (argv, ctx) => openEditor("nano", argv, ctx),
  },
  {
    name: "edit",
    summary: "Alias for nano",
    usage: "edit <path>",
    args: (cwd) => dirEntries(cwd),
    run: (argv, ctx) => openEditor("edit", argv, ctx),
  },
  {
    name: "reset",
    summary: "Revert a resume file to its default content",
    usage: "reset <file>",
    args: () => Object.keys(RESUME_LOOKUP),
    run: async (argv, ctx) => {
      if (!ctx.loggedIn) return [err("reset: permission denied"), dim("run `login` first")];
      const name = argv[0];
      if (!name) return [err("reset: missing operand"), dim("usage: reset <file>")];
      const field = RESUME_LOOKUP[name];
      if (!field) return [err(`reset: ${name}: not a resume file`)];
      resetResumeFile(name);
      const remote = await ctx.resetRemote(field);
      return remote.ok
        ? [dim(`${name} reverted to default and synced`)]
        : [dim(`${name} reverted locally`), err(`sync failed: ${remote.error}`)];
    },
  },
  {
    name: "log",
    summary: "Show recent edits to the live site",
    run: async (_argv, ctx) => {
      if (!ctx.loggedIn) return [err("log: permission denied"), dim("run `login` first")];
      const result = await ctx.fetchAuditLog();
      if (!result.ok) return [err(`log: ${result.error}`)];
      if (result.log.length === 0) return [dim("no edits recorded yet")];
      return [
        out(),
        ...result.log.map((e) =>
          out(`${e.at}  ${e.action.padEnd(5)} ${e.field.padEnd(14)} from ${e.ip}`)
        ),
        out(),
      ];
    },
  },
  {
    name: "wall",
    summary: "Read or sign the guestbook",
    usage:
      "wall [message] | wall --as <name> [message] | wall --delete <id> | wall --delete all --yes",
    run: async (argv, ctx) => {
      if (argv[0] === "--delete" || argv[0] === "-d") {
        if (!ctx.loggedIn) return [err("wall: permission denied"), dim("run `login` first")];

        if (argv[1] === "all") {
          if (argv[2] !== "--yes") {
            return [
              err("wall: this deletes every guestbook entry, permanently"),
              dim("re-run as `wall --delete all --yes` to confirm"),
            ];
          }
          const result = await ctx.deleteAllWall();
          return result.ok
            ? [dim(`deleted all ${result.count} guestbook entries`)]
            : [err(`wall: ${result.error}`)];
        }

        const id = argv[1];
        if (!id) return [err("wall: missing id"), dim("usage: wall --delete <id>")];
        const result = await ctx.deleteWall(id);
        return result.ok ? [dim(`deleted ${id}`)] : [err(`wall: ${result.error}`)];
      }

      let name = getWallHandle();
      let rest = argv;
      if (argv[0] === "--as") {
        const newName = argv[1];
        if (!newName) {
          return [err("wall: --as needs a name"), dim("usage: wall --as <name> [message]")];
        }
        name = newName;
        setWallHandle(name);
        rest = argv.slice(2);
      }

      const message = rest.join(" ").trim();

      if (!message) {
        const result = await ctx.fetchWall();
        if (!result.ok) return [err(`wall: ${result.error}`)];
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
      return result.ok ? [dim(`posted to the wall as ${name}`)] : [err(`wall: ${result.error}`)];
    },
  },
  {
    name: "mkdir",
    summary: "Create a scratch file placeholder",
    usage: "mkdir <name>",
    run: (argv, ctx) => {
      if (ctx.cwd[0] !== "scratch") return [err("mkdir: only /scratch is writable for directories")];
      const name = argv[0];
      if (!name) return [err("mkdir: missing operand")];
      scratchTouch(`${name}/.keep`);
      return [dim(`created scratch/${name}/`)];
    },
  },
  {
    name: "touch",
    summary: "Create an empty file in scratch",
    usage: "touch <name>",
    run: (argv, ctx) => {
      if (ctx.cwd[0] !== "scratch") return [err("touch: only /scratch is writable")];
      const name = argv[0];
      if (!name) return [err("touch: missing operand")];
      scratchTouch(name);
      return [];
    },
  },
  {
    name: "rm",
    summary: "Remove a file from scratch",
    usage: "rm <name>",
    run: (argv, ctx) => {
      if (ctx.cwd[0] !== "scratch") return [err("rm: only /scratch is writable")];
      const name = argv[0];
      if (!name) return [err("rm: missing operand")];
      return scratchRemove(name) ? [] : [err(`rm: ${name}: no such file`)];
    },
  },
  {
    name: "grep",
    summary: "Search everything for a term",
    usage: "grep <term>",
    run: (argv) => {
      const term = argv.join(" ").trim();
      if (!term) return [err("grep: missing pattern"), dim("usage: grep <term>")];
      const q = term.toLowerCase();
      const hits = corpus().filter(([, text]) => text.toLowerCase().includes(q));
      if (hits.length === 0) return [dim(`no matches for "${term}"`)];

      const lines: Line[] = [out()];
      const seen = new Set<string>();
      for (const [where, text] of hits) {
        const key = where + text.slice(0, 40);
        if (seen.has(key)) continue;
        seen.add(key);
        const i = text.toLowerCase().indexOf(q);
        const snippet = text.slice(Math.max(0, i - 30), i + 60).trim();
        lines.push(accent(where));
        lines.push(out(`  ...${snippet}...`));
      }
      lines.push(out());
      lines.push(dim(`${hits.length} match${hits.length === 1 ? "" : "es"}`));
      lines.push(out());
      return lines;
    },
  },
  {
    name: "open",
    summary: "Open a link in a new tab",
    usage: "open <target>",
    args: () => Object.keys(openTargets()),
    run: (argv) => {
      const targets = openTargets();
      const key = (argv[0] ?? "").toLowerCase();
      const url = targets[key];
      if (!url) {
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
    run: async (argv, ctx) => {
      const password = argv.join(" ");
      if (!password) return [err("login: missing password"), dim("usage: login <password>")];
      const result = await ctx.login(password);
      return result.ok
        ? [dim("authenticated - write access to /resume granted for this session")]
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
        return [err(`theme: expected dark or light`)];
      }
      ctx.setTheme(next);
      return [dim(`theme -> ${next}`)];
    },
  },
  {
    name: "clear",
    summary: "Clear the screen",
    run: (_argv, ctx) => {
      ctx.clear();
    },
  },
  {
    name: "exit",
    summary: "Close the terminal",
    run: (_argv, ctx) => {
      ctx.close();
    },
  },
  {
    name: "sudo",
    summary: "Nice try",
    run: (argv, ctx) => {
      if (ctx.loggedIn) return [dim("you already have write access - just use `nano`")];
      return [
        err(`${getField("profile").handle} is not in the sudoers file.`),
        dim(argv.length ? `This incident (${argv.join(" ")}) has been reported.` : "This incident has been reported."),
      ];
    },
  },
];

const RESUME_LOOKUP: Record<string, import("../data/store").ResumeField> = {
  "profile.json": "profile",
  "summary.txt": "summary",
  "experience.json": "experience",
  "projects.json": "projects",
  "skills.json": "skillGroups",
  "education.json": "education",
  "certificates.json": "certificates",
  "publications.json": "publications",
};

export const commandNames = commands.map((c) => c.name);
export function findCommand(name: string) {
  return commands.find((c) => c.name === name);
}
