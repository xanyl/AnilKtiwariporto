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

The terminal supports `help`, `neofetch`, `whoami`, `ls`, `cat <section>`,
`grep <term>`, `open <target>`, `resume`, `theme`, `clear` and `exit`, with tab
completion and command history. Commands are defined in
`src/terminal/commands.ts` and read the same data as the rendered page, so the
two can never drift.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS (theme tokens as CSS custom properties, `data-theme` on `<html>`)
- Framer Motion for scroll reveals
- `@fontsource` JetBrains Mono + Inter, self-hosted

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build
npm run lint
```

## Editing content

All resume content lives in **`src/data/resume.ts`** — profile, summary,
experience, projects, skills, education, certifications, publications, and the
section list that drives the nav. Nothing else needs to be touched to update
the site's content.

Certificate PDFs live in `certificates/` and are imported by
`src/data/resume.ts`. The downloadable resume is `public/Resume_Anil.pdf`
(keep it in sync with `resume/Resume_Anil.pdf`).

## Layout

```
src/
  data/resume.ts      single source of truth for all content
  hooks/              theme, scroll-spy, keyboard nav, reduced motion, github
  components/         Section, Reveal, Tag, Metric, TypeLine, CommandPalette,
                      Terminal, nav/TopBar
  terminal/           command definitions + output primitives
  sections/           one file per page section
  App.tsx             composes the sections
  index.css           theme tokens, base styles, print stylesheet
```

## Deploy

Static build; `vercel.json` rewrites everything to `index.html`.
