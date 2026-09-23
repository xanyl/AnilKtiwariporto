import {
  certificates,
  education,
  experience,
  profile,
  projects,
  publications,
  skillGroups,
  summary,
} from "../data/resume";
import type { Command, Line } from "./types";
import { accent, art, dim, err, out } from "./types";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

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
  const info: [string, string][] = [
    ["user", profile.handle],
    ["title", profile.roles.join(" / ")],
    ["location", profile.location],
    ["school", "Georgia State University (M.S. CS, 2027)"],
    ["exp", `${experience.length} roles - ${experience[experience.length - 1].start} to present`],
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
      return [out(), ...wrap(summary).map(out), out()];

    case "experience":
      return [
        out(),
        ...experience.flatMap((j) => [
          accent(`${j.role} @ ${j.org}`),
          dim(`  ${j.start} - ${j.end}   [${j.stack.join(", ")}]`),
          ...bullets(j.bullets),
          out(),
        ]),
      ];

    case "projects":
      return [
        out(),
        ...projects.flatMap((p) => [
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
        ...skillGroups.flatMap((g) => [
          accent(g.label),
          ...wrap(g.items.join(", "), 74, "  ").map(out),
          out(),
        ]),
      ];

    case "education":
      return [
        out(),
        ...education.map((e) => out(`${e.degree} - ${e.school} (${e.detail})`)),
        out(),
      ];

    case "certifications":
      return [
        out(),
        ...certificates.map((c) => out(`${c.issued.padEnd(10)} ${c.title} - ${c.issuer}`)),
        out(),
      ];

    case "publications":
      return [
        out(),
        ...publications.flatMap((p) => [accent(p.title), dim(`  ${p.venue} - ${p.url}`)]),
        out(),
      ];

    case "contact":
      return [
        out(),
        out(`email     ${profile.email}`),
        out(`phone     ${profile.phone}`),
        out(`github    ${profile.github}`),
        out(`linkedin  ${profile.linkedin}`),
        out(`location  ${profile.location}`),
        out(),
      ];

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
  const rows: [string, string][] = [["summary", summary]];
  experience.forEach((j) => {
    rows.push([`experience/${slug(j.org)}`, `${j.role} ${j.org} ${j.stack.join(" ")}`]);
    j.bullets.forEach((b) => rows.push([`experience/${slug(j.org)}`, b]));
  });
  projects.forEach((p) => {
    rows.push([`projects/${slug(p.name)}`, `${p.name} ${p.blurb} ${p.stack.join(" ")}`]);
    p.bullets.forEach((b) => rows.push([`projects/${slug(p.name)}`, b]));
  });
  skillGroups.forEach((g) => rows.push([`skills/${slug(g.label)}`, g.items.join(" ")]));
  certificates.forEach((c) => rows.push(["certifications", `${c.title} ${c.issuer}`]));
  publications.forEach((p) => rows.push(["publications", `${p.title} ${p.venue}`]));
  return rows;
}

const OPEN_TARGETS: Record<string, string> = {
  github: profile.github,
  linkedin: profile.linkedin,
  resume: profile.resume,
  site: "/",
  ...Object.fromEntries(publications.map((p) => ["paper", p.url])),
  ...Object.fromEntries(
    projects.filter((p) => p.repo).map((p) => [slug(p.name), p.repo as string])
  ),
};

export const commands: Command[] = [
  {
    name: "help",
    summary: "List available commands",
    run: () => [
      out(),
      accent("Available commands"),
      ...commands.map((c) =>
        out(`  ${c.name.padEnd(14)} ${c.summary}`)
      ),
      out(),
      dim("  Tab completes - Up/Down recalls history - Esc closes the terminal"),
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
    run: () => [
      out(),
      accent(profile.name),
      out(profile.roles.join(" / ")),
      dim(`${profile.location} - ${profile.email}`),
      out(),
      ...wrap(summary).map(out),
      out(),
    ],
  },
  {
    name: "ls",
    summary: "List resume sections",
    run: () => [out(), out(SECTIONS.join("   ")), out()],
  },
  {
    name: "cat",
    summary: "Print a section",
    usage: "cat <section>",
    args: () => SECTIONS,
    run: (argv) =>
      argv[0]
        ? catSection(argv[0].toLowerCase())
        : [err("cat: missing operand"), dim("usage: cat <section>"), dim(`sections: ${SECTIONS.join(", ")}`)],
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
    args: () => Object.keys(OPEN_TARGETS),
    run: (argv) => {
      const key = (argv[0] ?? "").toLowerCase();
      const url = OPEN_TARGETS[key];
      if (!url) {
        return [
          err(`open: unknown target "${argv[0] ?? ""}"`),
          dim(`targets: ${Object.keys(OPEN_TARGETS).join(", ")}`),
        ];
      }
      window.open(url, "_blank", "noopener");
      return [dim(`opening ${url}`)];
    },
  },
  {
    name: "resume",
    summary: "Download the PDF resume",
    run: () => {
      const a = document.createElement("a");
      a.href = profile.resume;
      a.download = "Anil_Kumar_Tiwari_Resume.pdf";
      a.click();
      return [dim("downloading Resume_Anil.pdf ...")];
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
    run: (argv) => [
      err(`${profile.handle} is not in the sudoers file.`),
      dim(argv.length ? `This incident (${argv.join(" ")}) has been reported.` : "This incident has been reported."),
    ],
  },
];

export const commandNames = commands.map((c) => c.name);
export function findCommand(name: string) {
  return commands.find((c) => c.name === name);
}
