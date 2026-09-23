import { useCallback, useEffect, useRef, useState } from "react";
import { FiX } from "react-icons/fi";
import { profile } from "../data/resume";
import useReducedMotion from "../hooks/useReducedMotion";
import type { Theme } from "../hooks/useTheme";
import { commandNames, findCommand } from "../terminal/commands";
import type { Line } from "../terminal/types";
import { accent, dim, err, out } from "../terminal/types";

const PROMPT = "anil@portfolio:~$";

const BOOT: Line[] = [
  dim("Booting portfolio shell ..."),
  dim("Loading resume from src/data/resume.ts ... ok"),
  out(),
  accent(`Hi, I'm ${profile.name}.`),
  out("This is a real shell over my resume. Everything below is live data."),
  out(),
  out("Type `help` for commands, `neofetch` for the short version,"),
  out("`grep <term>` to search my whole history, or `exit` to leave."),
  out(),
];

const KIND_CLASS: Record<Line["kind"], string> = {
  out: "text-fg",
  dim: "text-faint",
  accent: "text-accent",
  err: "text-red-400",
  input: "text-muted",
  art: "text-accent",
};

interface Props {
  open: boolean;
  onClose: () => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export default function Terminal({ open, onClose, theme, setTheme }: Props) {
  const [lines, setLines] = useState<Line[]>([]);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIndex, setHistIndex] = useState(-1);
  const [booted, setBooted] = useState(false);

  const reduced = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  const print = useCallback(
    (next: Line[]) => setLines((prev) => [...prev, ...next]),
    []
  );

  // Boot sequence: typed out on first open, instant when motion is reduced.
  useEffect(() => {
    if (!open || booted) return;
    setBooted(true);
    restoreRef.current = document.activeElement as HTMLElement;

    if (reduced) {
      setLines(BOOT);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      setLines(BOOT.slice(0, i + 1));
      i += 1;
      if (i >= BOOT.length) clearInterval(id);
    }, 70);
    return () => clearInterval(id);
  }, [open, booted, reduced]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, lines]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const close = useCallback(() => {
    onClose();
    restoreRef.current?.focus();
  }, [onClose]);

  function submit(raw: string) {
    const input = raw.trim();
    print([{ kind: "input", text: `${PROMPT} ${input}` }]);
    setValue("");
    if (!input) return;

    setHistory((h) => [input, ...h.filter((x) => x !== input)].slice(0, 50));
    setHistIndex(-1);

    const [name, ...argv] = input.split(/\s+/);
    const cmd = findCommand(name.toLowerCase());
    if (!cmd) {
      print([
        err(`command not found: ${name}`),
        dim("type `help` to see what's available"),
      ]);
      return;
    }

    const result = cmd.run(argv, {
      print,
      clear: () => setLines([]),
      close,
      theme,
      setTheme,
      });
    if (result) print(result);
  }

  function complete() {
    const parts = value.split(/\s+/);
    if (parts.length <= 1) {
      const hits = commandNames.filter((n) => n.startsWith(parts[0] ?? ""));
      if (hits.length === 1) setValue(hits[0] + " ");
      else if (hits.length > 1) print([out(hits.join("   "))]);
      return;
    }
    const cmd = findCommand(parts[0].toLowerCase());
    const options = cmd?.args?.() ?? [];
    const partial = parts[parts.length - 1];
    const hits = options.filter((o) => o.startsWith(partial));
    if (hits.length === 1) setValue([...parts.slice(0, -1), hits[0]].join(" ") + " ");
    else if (hits.length > 1) print([out(hits.join("   "))]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit(value);
    } else if (e.key === "Tab") {
      e.preventDefault();
      complete();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(history.length - 1, histIndex + 1);
      if (next >= 0) {
        setHistIndex(next);
        setValue(history[next]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = histIndex - 1;
      setHistIndex(next);
      setValue(next >= 0 ? history[next] : "");
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  if (!open) return null;

  return (
    <div
      className="no-print fixed inset-0 z-[80] flex items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Interactive terminal"
    >
      <button
        type="button"
        aria-label="Close terminal"
        onClick={close}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />

      <div className="relative flex h-full w-full max-w-3xl flex-col overflow-hidden border border-line bg-bg shadow-2xl shadow-black/50 sm:h-[36rem] sm:rounded-md">
        {/* title bar */}
        <div className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-3 py-2">
          <span aria-hidden className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent/80" />
          </span>
          <p className="flex-1 text-center font-mono text-2xs text-faint">
            {profile.handle} — zsh
          </p>
          <button
            type="button"
            onClick={close}
            aria-label="Close terminal"
            className="text-faint transition-colors hover:text-fg"
          >
            <FiX size={14} />
          </button>
        </div>

        {/* scrollback */}
        <div
          ref={scrollRef}
          onClick={() => inputRef.current?.focus()}
          className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[0.78rem] leading-relaxed"
        >
          {lines.map((l, i) => (
            <pre
              key={i}
              className={`whitespace-pre-wrap break-words ${KIND_CLASS[l.kind]}`}
            >
              {l.kind === "input" ? (
                <>
                  <span className="text-accent">{PROMPT}</span>
                  {l.text.slice(PROMPT.length)}
                </>
              ) : (
                l.text || " "
              )}
            </pre>
          ))}

          {/* live prompt */}
          <label className="flex items-baseline gap-2">
            <span className="shrink-0 text-accent">{PROMPT}</span>
            <span className="sr-only">Terminal input</span>
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="w-full flex-1 bg-transparent text-fg caret-accent outline-none"
            />
          </label>
        </div>

        <div className="shrink-0 border-t border-line bg-surface px-3 py-1.5 font-mono text-2xs text-faint">
          help · neofetch · grep &lt;term&gt; · cat &lt;section&gt; · exit
        </div>
      </div>
    </div>
  );
}
