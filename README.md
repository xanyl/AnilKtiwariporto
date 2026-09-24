# anilktiwari.com

Personal site for **Anil Kumar Tiwari** — AI engineer, data engineer and researcher, Atlanta GA.

A single-page resume site: one scrolling document with a sticky section nav,
dark/light themes, and a print stylesheet that turns the page into a clean
printable resume.

Three ways to navigate it:

| | |
|---|---|
| scroll / `j` `k` | move between sections |
| `⌘K` / `Ctrl+K` | command palette — jump, copy email, download resume |
| ``Ctrl+` `` | interactive terminal — a real REPL over the resume data |

The terminal is a real shell over a small virtual filesystem (`/resume`,
`/scratch`): `help`, `neofetch`, `whoami`, `date`, `uptime`, `uname`, `id`,
`env`, `history`, `man <command>`, `pwd`, `cd`, `ls -la`, `cat <path>`,
`edit <path>`, `reset <file>`, `log` (edit audit trail), `mkdir`, `touch`,
`rm`, `grep <term>`, `open <target>`, `resume`, `login`, `logout`, `theme`,
`clear` and `exit` — chainable with `;` / `&&`, with path-aware tab
completion and command history persisted across reloads (except `login`
lines, which are never written to disk). Commands are defined in
`src/terminal/commands.ts` and `src/terminal/vfs.ts`, and read the same live
store as the rendered page (`src/data/store.ts`), so the two can never drift.

### Editing the site from the terminal

`/resume` holds one file per content section (`summary.txt`,
`experience.json`, `projects.json`, ...). `cat` reads them, `edit` opens an
in-terminal editor (Ctrl+S to save, Esc to cancel). Editing is read-only until
you authenticate:

```
login <password>
edit resume/summary.txt
```

`login` calls the `/api/auth` Netlify Function, which checks the password
against the `ADMIN_PASSWORD` environment variable (never committed) and
returns a short-lived signed session token — no password is ever hardcoded in
the client or the repo. Saved edits are written to Netlify Blobs via
`/api/resume-data` and merged over the defaults in `src/data/resume.ts` for
every visitor on load, so a save is a real, if instant, content update to the
live site. `reset <file>` reverts a section back to its default. The
`/scratch` directory is a normal writable playground (`mkdir`/`touch`/`rm`)
that never touches site content — it's just there for the shell to feel real.

**One-time setup, per Netlify site:**

```bash
netlify env:set ADMIN_PASSWORD 'choose-a-strong-password'
netlify env:set AUTH_SECRET "$(openssl rand -hex 32)"
```

Locally, put the same two variables in a `.env` file (already gitignored) and
run `npm run dev:full` (uses the Netlify CLI so the functions and Blobs
emulator run alongside Vite — plain `npm run dev` won't have `/api/*`).

### Hardening

- **Login is rate-limited.** `/api/auth` tracks failed attempts per IP in
  Blobs and locks that IP out for 15 minutes after 5 wrong passwords in a
  15-minute window — brute-forcing `ADMIN_PASSWORD` isn't practical.
- **Password comparison is constant-time and fixed-length**: both the
  submitted and expected password are HMAC'd before `crypto.timingSafeEqual`,
  so a wrong guess can't leak the real password's length via timing.
- **Every write is schema-validated** (`netlify/functions/lib/schema.mts`,
  Zod) — shape-checked per field, and any URL-bearing field (profile links,
  project repos, certificate/publication URLs) is restricted to
  `http(s)`/`mailto`/`tel`. This closes off a stored-XSS path: without it, a
  compromised session token could plant a `javascript:` URL that would run in
  every visitor's browser. `src/data/sanitize.ts` enforces the same allowlist
  again client-side as defense in depth.
- **Every edit is audited.** `PUT`/`DELETE` on `/api/resume-data` append to an
  append-only log (field, action, timestamp, IP) in Blobs, readable with the
  terminal's `log` command while logged in.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS (theme tokens as CSS custom properties, `data-theme` on `<html>`)
- Framer Motion for scroll reveals
- `@fontsource` JetBrains Mono + Inter, self-hosted

## Develop

```bash
npm install
npm run dev      # http://localhost:5173 — content only, no /api/*
npm run dev:full # http://localhost:8888 — Netlify CLI, functions + Blobs emulator
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build
npm run lint
```

## Editing content

Default resume content lives in **`src/data/resume.ts`** — profile, summary,
experience, projects, skills, education, certifications, publications, and the
section list that drives the nav. These are the fallback values; anything
saved via the terminal's `login` + `edit` flow (see above) overrides them at
runtime without a rebuild. Edit `resume.ts` directly for permanent baseline
changes that ship with the next deploy.

Certificate PDFs live in `certificates/` and are imported by
`src/data/resume.ts`. The downloadable resume is `public/Resume_Anil.pdf`
(keep it in sync with `resume/Resume_Anil.pdf`).

## Layout

```
src/
  data/resume.ts      default content (baseline, ships in the build)
  data/store.ts        live content store (defaults + terminal overrides)
  data/api.ts          client for /api/auth and /api/resume-data
  data/sanitize.ts      href scheme allowlist (defense in depth vs. stored XSS)
  hooks/              theme, scroll-spy, keyboard nav, reduced motion, github
  components/         Section, Reveal, Tag, Metric, TypeLine, CommandPalette,
                      Terminal, nav/TopBar
  terminal/           command definitions, virtual filesystem, output primitives
  sections/           one file per page section (read live content via useResumeField)
  App.tsx             composes the sections, loads overrides on boot
  index.css           theme tokens, base styles, print stylesheet
netlify/functions/
  auth.mts            POST /api/auth — rate-limited password check, issues a session token
  resume-data.mts     GET/PUT/DELETE /api/resume-data — validated, audited, Blobs-backed store
  lib/session.mts     HMAC session signing/verification (AUTH_SECRET)
  lib/schema.mts      Zod schemas + URL-scheme allowlist for every editable field
```

## Deploy

Static build hosted on Netlify (`netlify.toml`): SPA fallback to
`index.html`, apex/`www` redirect, security headers, long-lived caching for
fingerprinted assets, and two serverless Functions (`/api/auth`,
`/api/resume-data`) backing the terminal's login/edit feature. Requires the
`ADMIN_PASSWORD` and `AUTH_SECRET` environment variables to be set on the site
(see above) — without them, `/api/auth` responds 500 and the site falls back
to read-only defaults.
