import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiArrowRight,
  FiCheck,
  FiCopy,
  FiDownload,
  FiExternalLink,
  FiFileText,
  FiGithub,
  FiLinkedin,
  FiMoon,
  FiSun,
  FiTerminal,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import type { SectionMeta } from "../data/resume";
import { useResumeField } from "../data/store";
import type { Theme } from "../hooks/useTheme";

interface Command {
  id: string;
  label: string;
  hint: string;
  Icon: IconType;
  run: () => void;
  /** Keeps the palette open so the confirmation tick is visible. */
  keepOpen?: boolean;
}

interface Props {
  sections: SectionMeta[];
  theme: Theme;
  onToggleTheme: () => void;
  onOpenTerminal: () => void;
  /** The terminal owns the keyboard while it is open. */
  suspended?: boolean;
}

/** Subsequence match, so "extl" finds "External" and "prj" finds "Projects". */
function matches(query: string, label: string) {
  if (!query) return true;
  const q = query.toLowerCase();
  const l = label.toLowerCase();
  let i = 0;
  for (const ch of l) {
    if (ch === q[i]) i += 1;
    if (i === q.length) return true;
  }
  return false;
}

export default function CommandPalette({
  sections,
  theme,
  onToggleTheme,
  onOpenTerminal,
  suspended = false,
}: Props) {
  const profile = useResumeField("profile");
  const publications = useResumeField("publications");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setCursor(0);
    restoreRef.current?.focus();
  }, []);

  const commands = useMemo<Command[]>(() => {
    const go = (id: string) => () =>
      document.getElementById(id)?.scrollIntoView({ block: "start" });

    const jumps: Command[] = sections.map((s) => ({
      id: `go-${s.id}`,
      label: s.label,
      hint: "Jump to section",
      Icon: FiArrowRight,
      run: go(s.id),
    }));

    const actions: Command[] = [
      {
        id: "terminal",
        label: "Open interactive terminal",
        hint: "Ctrl+`",
        Icon: FiTerminal,
        run: onOpenTerminal,
      },
      {
        id: "copy-email",
        label: "Copy email address",
        hint: profile.email,
        Icon: copied ? FiCheck : FiCopy,
        keepOpen: true,
        run: () => {
          navigator.clipboard?.writeText(profile.email).then(
            () => setCopied(true),
            () => setCopied(false)
          );
        },
      },
      {
        id: "resume",
        label: "Download resume",
        hint: "PDF",
        Icon: FiDownload,
        run: () => {
          const a = document.createElement("a");
          a.href = profile.resume;
          a.download = "Anil_Kumar_Tiwari_Resume.pdf";
          a.click();
        },
      },
      {
        id: "github",
        label: "Open GitHub",
        hint: profile.githubLabel,
        Icon: FiGithub,
        run: () => window.open(profile.github, "_blank", "noopener"),
      },
      {
        id: "linkedin",
        label: "Open LinkedIn",
        hint: profile.linkedinLabel,
        Icon: FiLinkedin,
        run: () => window.open(profile.linkedin, "_blank", "noopener"),
      },
      ...publications.map((p) => ({
        id: `pub-${p.venue}`,
        label: "Open paper: DAAL",
        hint: p.venue,
        Icon: FiFileText as IconType,
        run: () => window.open(p.url, "_blank", "noopener"),
      })),
      {
        id: "theme",
        label: `Switch to ${theme === "dark" ? "light" : "dark"} theme`,
        hint: "Appearance",
        Icon: theme === "dark" ? FiSun : FiMoon,
        keepOpen: true,
        run: onToggleTheme,
      },
      {
        id: "email",
        label: "Send an email",
        hint: profile.email,
        Icon: FiExternalLink,
        run: () => {
          window.location.href = `mailto:${profile.email}`;
        },
      },
    ];

    return [...jumps, ...actions];
  }, [sections, theme, onToggleTheme, onOpenTerminal, copied, profile, publications]);

  const results = useMemo(
    () => commands.filter((c) => matches(query, `${c.label} ${c.hint}`)),
    [commands, query]
  );

  // Global open/close shortcut.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (suspended) return;
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        restoreRef.current = document.activeElement as HTMLElement;
        setOpen((o) => !o);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        close();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, suspended]);

  useEffect(() => {
    if (open) {
      setCopied(false);
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => setCursor(0), [query]);

  if (!open || suspended) return null;

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || (e.key === "n" && e.ctrlKey)) {
      e.preventDefault();
      setCursor((c) => (results.length ? (c + 1) % results.length : 0));
    } else if (e.key === "ArrowUp" || (e.key === "p" && e.ctrlKey)) {
      e.preventDefault();
      setCursor((c) =>
        results.length ? (c - 1 + results.length) % results.length : 0
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = results[cursor];
      if (!cmd) return;
      cmd.run();
      if (!cmd.keepOpen) close();
    }
  }

  return (
    <div
      className="no-print fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <button
        type="button"
        aria-label="Close command palette"
        onClick={close}
        className="absolute inset-0 cursor-default bg-bg/70 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-lg overflow-hidden rounded-md border border-line bg-surface shadow-2xl shadow-black/40">
        <div className="flex items-center gap-2 border-b border-line px-3">
          <span aria-hidden className="font-mono text-sm text-accent">
            &gt;
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Jump to a section or run a command…"
            aria-label="Search commands"
            className="w-full bg-transparent py-3 font-mono text-sm text-fg outline-none placeholder:text-faint"
          />
          <kbd className="shrink-0 rounded-sm border border-line px-1.5 py-0.5 font-mono text-2xs text-faint">
            esc
          </kbd>
        </div>

        <ul className="max-h-[52vh] overflow-y-auto py-1">
          {results.length === 0 && (
            <li className="px-4 py-6 text-center font-mono text-2xs text-faint">
              No matches
            </li>
          )}
          {results.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseMove={() => setCursor(i)}
                onClick={() => {
                  c.run();
                  if (!c.keepOpen) close();
                }}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                  i === cursor ? "bg-accent/10" : ""
                }`}
              >
                <c.Icon
                  size={13}
                  className={i === cursor ? "text-accent" : "text-faint"}
                />
                <span className="flex-1 truncate font-mono text-sm text-fg">
                  {c.id === "copy-email" && copied ? "Copied!" : c.label}
                </span>
                <span className="shrink-0 truncate font-mono text-2xs text-faint">
                  {c.hint}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3 border-t border-line px-3 py-2 font-mono text-2xs text-faint">
          <span>
            <kbd className="text-fg">&uarr;&darr;</kbd> navigate
          </span>
          <span>
            <kbd className="text-fg">&crarr;</kbd> select
          </span>
        </div>
      </div>
    </div>
  );
}
