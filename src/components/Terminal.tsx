import { useCallback, useEffect, useRef, useState } from "react";
import { FiX } from "react-icons/fi";
import * as authApi from "../data/api";
import { getField, useResumeField } from "../data/store";
import type { ResumeField } from "../data/store";
import useReducedMotion from "../hooks/useReducedMotion";
import type { Theme } from "../hooks/useTheme";
import { commandNames, findCommand } from "../terminal/commands";
import type { EditRequest, Line } from "../terminal/types";
import { accent, dim, err, out } from "../terminal/types";
import { pathStr } from "../terminal/vfs";

const BOOT: Line[] = [
  dim("Booting portfolio shell ..."),
  dim("Loading resume from /resume ... ok"),
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
  const profile = useResumeField("profile");
  const [lines, setLines] = useState<Line[]>([]);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIndex, setHistIndex] = useState(-1);
  const [booted, setBooted] = useState(false);
  const [cwd, setCwd] = useState<string[]>([]);
  const [token, setToken] = useState<string | null>(() => authApi.getStoredToken());
  const [editing, setEditing] = useState<EditRequest | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const reduced = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  const loggedIn = token !== null;
  const prompt = `${loggedIn ? "root" : "guest"}@portfolio:${pathStr(cwd) === "/" ? "~" : pathStr(cwd)}${
    loggedIn ? "#" : "$"
  }`;

  const print = useCallback((next: Line[]) => setLines((prev) => [...prev, ...next]), []);

  const boot = useCallback(() => {
    const greeting: Line[] = [
      ...BOOT,
      accent(`Hi, I'm ${profile.name}.`),
      out("This is a real shell over my resume. Everything below is live data."),
      out(),
      out("Type `help` for commands, `neofetch` for the short version,"),
      out("`grep <term>` to search, or `login` to edit the site."),
      out(),
    ];
    return greeting;
  }, [profile.name]);

  // Boot sequence: typed out on first open, instant when motion is reduced.
  useEffect(() => {
    if (!open || booted) return;
    setBooted(true);
    restoreRef.current = document.activeElement as HTMLElement;

    const script = boot();
    if (reduced) {
      setLines(script);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      setLines(script.slice(0, i + 1));
      i += 1;
      if (i >= script.length) clearInterval(id);
    }, 70);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, booted, reduced]);

  useEffect(() => {
    if (open && !editing) inputRef.current?.focus();
  }, [open, lines, editing]);

  useEffect(() => {
    if (editing) editorRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const close = useCallback(() => {
    onClose();
    restoreRef.current?.focus();
  }, [onClose]);

  const login = useCallback(async (password: string) => {
    try {
      const t = await authApi.login(password);
      authApi.storeToken(t);
      setToken(t);
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "login failed" };
    }
  }, []);

  const logout = useCallback(() => {
    authApi.storeToken(null);
    setToken(null);
  }, []);

  async function submit(raw: string) {
    const input = raw.trim();
    const isLogin = /^login\b/.test(input);
    print([{ kind: "input", text: `${prompt} ${isLogin ? "login ********" : input}` }]);
    setValue("");
    if (!input) return;

    setHistory((h) => [input, ...h.filter((x) => x !== input)].slice(0, 50));
    setHistIndex(-1);

    const [name, ...argv] = input.split(/\s+/);
    const cmd = findCommand(name.toLowerCase());
    if (!cmd) {
      print([err(`command not found: ${name}`), dim("type `help` to see what's available")]);
      return;
    }

    const result = await cmd.run(argv, {
      print,
      clear: () => setLines([]),
      close,
      theme,
      setTheme,
      cwd,
      setCwd,
      loggedIn,
      login,
      logout,
      requestEdit: (req) => {
        setEditing(req);
        setDraft(req.initialText);
      },
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

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await editing.onSave(draft);
      print([dim(`saved ${editing.path}`)]);
      if (editing.path.startsWith("/resume/") && loggedIn && token) {
        await persistResumeEdit(editing.path, token, print);
      }
      setEditing(null);
    } catch (e) {
      print([err(`edit: ${e instanceof Error ? e.message : "save failed"}`)]);
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEditing(null);
    print([dim("edit cancelled")]);
  }

  function onEditorKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void saveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
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
            {loggedIn ? "root" : profile.handle} — zsh
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

        {editing ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface px-3 py-1.5 font-mono text-2xs text-faint">
              <span>
                editing <span className="text-accent">{editing.path}</span>
              </span>
              <span>Ctrl+S save · Esc cancel</span>
            </div>
            <textarea
              ref={editorRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onEditorKeyDown}
              spellCheck={false}
              disabled={saving}
              className="w-full flex-1 resize-none bg-transparent px-4 py-3 font-mono text-[0.78rem] leading-relaxed text-fg outline-none"
            />
          </div>
        ) : (
          <div
            ref={scrollRef}
            onClick={() => inputRef.current?.focus()}
            className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[0.78rem] leading-relaxed"
          >
            {lines.map((l, i) => (
              <pre key={i} className={`whitespace-pre-wrap break-words ${KIND_CLASS[l.kind]}`}>
                {l.kind === "input" ? (
                  <>
                    <span className="text-accent">{l.text.slice(0, l.text.indexOf(" "))}</span>
                    {l.text.slice(l.text.indexOf(" "))}
                  </>
                ) : (
                  l.text || " "
                )}
              </pre>
            ))}

            {/* live prompt */}
            <label className="flex items-baseline gap-2">
              <span className="shrink-0 text-accent">{prompt}</span>
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
        )}

        <div className="shrink-0 border-t border-line bg-surface px-3 py-1.5 font-mono text-2xs text-faint">
          help · ls · cd · cat &lt;file&gt; · edit &lt;file&gt; · login · exit
        </div>
      </div>
    </div>
  );
}

const FIELD_BY_FILE: Record<string, ResumeField> = {
  "profile.json": "profile",
  "summary.txt": "summary",
  "experience.json": "experience",
  "projects.json": "projects",
  "skills.json": "skillGroups",
  "education.json": "education",
  "certificates.json": "certificates",
  "publications.json": "publications",
};

async function persistResumeEdit(path: string, token: string, print: (l: Line[]) => void) {
  const file = path.split("/")[2];
  const field = FIELD_BY_FILE[file];
  if (!field) return;
  try {
    await authApi.saveField(token, field, getField(field));
    print([dim("synced to the live site")]);
  } catch (e) {
    print([
      err(`sync failed: ${e instanceof Error ? e.message : "unknown error"}`),
      dim("your local view is updated but not saved server-side"),
    ]);
  }
}
