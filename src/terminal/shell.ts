import { findCommand } from "./commands";
import type { CommandContext, Line, Session } from "./types";
import { err } from "./types";
import { getVar } from "./env";
import { expandTilde, glob, homeOf, normalize, pathStr, writeFile } from "./vfs";
import type { ResumeField } from "../data/store";

type Op = ";" | "&&" | "||";

interface Word {
  value: string;
  /** Had an unquoted * or ? — eligible for filename expansion. */
  glob: boolean;
}

interface Stage {
  words: Word[];
  redirect?: { target: string; append: boolean };
}

type Token = { kind: "word"; word: Word } | { kind: "op"; op: string };

export interface ShellDeps {
  loggedIn: () => boolean;
  print: (lines: Line[]) => void;
  persistField: (field: ResumeField) => Promise<void>;
  makeCtx: (
    stdin: string[] | null,
    print: (lines: Line[]) => void,
    fail: (code?: number) => void,
    piped: boolean
  ) => CommandContext;
}

const DEFAULT_ALIASES: Record<string, string> = {
  ll: "ls -alF",
  la: "ls -A",
  l: "ls -CF",
};

export function createSession(loggedIn: boolean): Session {
  return { cwd: homeOf(loggedIn), oldpwd: null, env: {}, aliases: { ...DEFAULT_ALIASES }, status: 0 };
}

/** Splits a command line into words and operators, honouring quotes, escapes, $VARs and ~. */
function tokenize(
  input: string,
  session: Session,
  loggedIn: boolean,
  expandVars = true
): Token[] | { error: string } {
  const tokens: Token[] = [];
  const home = homeOf(loggedIn);
  let cur = "";
  let started = false;
  let hasGlob = false;

  const flush = () => {
    if (started) tokens.push({ kind: "word", word: { value: cur, glob: hasGlob } });
    cur = "";
    started = false;
    hasGlob = false;
  };

  const readVar = (from: number): [string, number] => {
    // from points just after the `$`
    if (input[from] === "?") return [getVar("?", session, loggedIn), from + 1];
    if (input[from] === "{") {
      const end = input.indexOf("}", from);
      if (end === -1) return ["$", from];
      return [getVar(input.slice(from + 1, end), session, loggedIn), end + 1];
    }
    const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(input.slice(from));
    if (!m) return ["$", from];
    return [getVar(m[0], session, loggedIn), from + m[0].length];
  };

  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (c === " " || c === "\t") {
      flush();
      i += 1;
    } else if (c === "#" && !started) {
      break;
    } else if (c === "'") {
      const end = input.indexOf("'", i + 1);
      if (end === -1) return { error: "unexpected EOF while looking for matching `''" };
      cur += input.slice(i + 1, end);
      started = true;
      i = end + 1;
    } else if (c === '"') {
      started = true;
      i += 1;
      let closed = false;
      while (i < input.length) {
        const d = input[i];
        if (d === '"') {
          closed = true;
          i += 1;
          break;
        }
        if (d === "\\" && i + 1 < input.length && '"\\$`'.includes(input[i + 1])) {
          cur += input[i + 1];
          i += 2;
        } else if (d === "$" && expandVars) {
          const [val, next] = readVar(i + 1);
          cur += val;
          i = next;
        } else {
          cur += d;
          i += 1;
        }
      }
      if (!closed) return { error: 'unexpected EOF while looking for matching `"\'' };
    } else if (c === "\\") {
      cur += input[i + 1] ?? "";
      started = true;
      i += 2;
    } else if (c === "$" && expandVars) {
      const [val, next] = readVar(i + 1);
      cur += val;
      started = started || val !== "";
      i = next;
    } else if (c === "~" && !started && (i + 1 === input.length || /[\s/;|&<>]/.test(input[i + 1]))) {
      cur += pathStr(home);
      started = true;
      i += 1;
    } else if (c === "|" || c === ">") {
      flush();
      if (input.slice(i, i + 2) === ">>") {
        tokens.push({ kind: "op", op: ">>" });
        i += 2;
      } else {
        tokens.push({ kind: "op", op: c });
        i += 1;
      }
    } else {
      if (c === "*" || c === "?") hasGlob = true;
      cur += c;
      started = true;
      i += 1;
    }
  }
  flush();
  return tokens;
}

/** Parses one pipeline (no ; && ||) into stages. */
function parsePipeline(tokens: Token[]): Stage[] | { error: string } {
  const stages: Stage[] = [];
  let stage: Stage = { words: [] };
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (t.kind === "word") {
      stage.words.push(t.word);
    } else if (t.op === ">" || t.op === ">>") {
      const target = tokens[i + 1];
      if (!target || target.kind !== "word") return { error: "syntax error near unexpected token `newline'" };
      stage.redirect = { target: target.word.value, append: t.op === ">>" };
      i += 1;
    } else {
      if (!stage.words.length) return { error: "syntax error near unexpected token `|'" };
      stages.push(stage);
      stage = { words: [] };
    }
  }
  if (stage.words.length) stages.push(stage);
  else if (stages.length) return { error: "syntax error: unexpected end of input" };
  return stages;
}

/**
 * Splits a line at top-level `;`, `&&` and `||` (never inside quotes). Each piece is
 * tokenized only when it is about to run, so `$?` and other variables see the state
 * left behind by the commands before it, as in a real shell.
 */
function splitItems(input: string): { items: { op: Op; text: string }[] } | { error: string } {
  const items: { op: Op; text: string }[] = [];
  let op: Op = ";";
  let cur = "";
  const push = (next: Op | null): string | null => {
    if (cur.trim() === "") {
      if (next === null || next === ";") return op === ";" ? null : "syntax error: unexpected end of input";
      return `syntax error near unexpected token \`${next}'`;
    }
    items.push({ op, text: cur });
    cur = "";
    if (next) op = next;
    return null;
  };

  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (c === "\\") {
      cur += input.slice(i, i + 2);
      i += 2;
    } else if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < input.length && input[j] !== c) j += c === '"' && input[j] === "\\" ? 2 : 1;
      cur += input.slice(i, j + 1);
      i = j + 1;
    } else if (c === "#" && (cur === "" || /\s$/.test(cur))) {
      break;
    } else if (c === ";" || c === "&") {
      const doubled = input[i + 1] === c;
      const next: Op = c === "&" && doubled ? "&&" : ";";
      const error = push(next);
      if (error) return { error };
      i += c === "&" && doubled ? 2 : 1;
    } else if (c === "|" && input[i + 1] === "|") {
      const error = push("||");
      if (error) return { error };
      i += 2;
    } else {
      cur += c;
      i += 1;
    }
  }
  const error = push(null);
  if (error) return { error };
  return { items };
}

export async function execute(input: string, session: Session, deps: ShellDeps): Promise<void> {
  const auth = () => ({ loggedIn: deps.loggedIn() });

  // `login` takes the rest of the line verbatim so passwords can contain quotes or operators.
  const loginMatch = /^\s*login\s+([\s\S]+)$/.exec(input);
  const split: { items: { op: Op; text: string; stages?: Stage[] }[] } | { error: string } = loginMatch
    ? {
        items: [
          {
            op: ";",
            text: "login",
            stages: [{ words: [{ value: "login", glob: false }, { value: loginMatch[1].trim(), glob: false }] }],
          },
        ],
      }
    : splitItems(input);
  if ("error" in split) {
    deps.print([err(`zsh: ${split.error}`)]);
    session.status = 2;
    return;
  }

  const resolveArgv = (stage: Stage): string[] => {
    let words = stage.words;
    const alias = session.aliases[words[0].value];
    if (alias !== undefined) {
      const expanded = tokenize(alias, session, deps.loggedIn(), false);
      if (!("error" in expanded)) {
        const aliasWords = expanded.flatMap((t) => (t.kind === "word" ? [t.word] : []));
        words = [...aliasWords, ...words.slice(1)];
      }
    }
    return words.flatMap((w, idx) => {
      if (idx === 0 || !w.glob) return [w.value];
      const hits = glob(session.cwd, w.value, auth());
      return hits.length ? hits : [w.value];
    });
  };

  const runStage = async (
    argv: string[],
    stdin: string[] | null,
    sink: (lines: Line[]) => void,
    piped: boolean
  ): Promise<number> => {
    // Bare `NAME=value` assignments set shell variables.
    if (argv.every((a) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(a))) {
      for (const a of argv) {
        const eq = a.indexOf("=");
        session.env[a.slice(0, eq)] = a.slice(eq + 1);
      }
      return 0;
    }

    const [name, ...args] = argv;
    const cmd = findCommand(name);
    if (!cmd) {
      sink([err(`zsh: command not found: ${name}`)]);
      return 127;
    }
    let code = 0;
    const emit = (lines: Line[]) => {
      if (lines.some((l) => l.kind === "err")) code = code || 1;
      sink(lines);
    };
    const ctx = deps.makeCtx(
      stdin,
      emit,
      (c = 1) => {
        code = c;
      },
      piped
    );
    try {
      const result = await cmd.run(args, ctx);
      if (result) emit(result);
    } catch (e) {
      emit([err(`${name}: ${e instanceof Error ? e.message : "unexpected error"}`)]);
    }
    return code;
  };

  for (const item of split.items) {
    if (item.op === "&&" && session.status !== 0) continue;
    if (item.op === "||" && session.status === 0) continue;

    let stages = item.stages;
    if (!stages) {
      const tokens = tokenize(item.text, session, deps.loggedIn());
      const parsed = "error" in tokens ? tokens : parsePipeline(tokens);
      if ("error" in parsed) {
        deps.print([err(`zsh: ${parsed.error}`)]);
        session.status = 2;
        return;
      }
      stages = parsed;
    }
    if (stages.length === 0) continue;

    let stdin: string[] | null = null;
    let code = 0;

    for (let s = 0; s < stages.length; s += 1) {
      const stage = stages[s];
      const isLast = s === stages.length - 1;
      const buffered = !isLast || stage.redirect !== undefined;
      const buffer: Line[] = [];

      const sink = (lines: Line[]) => {
        if (!buffered) {
          deps.print(lines);
          return;
        }
        // stderr is never piped or redirected, like a real shell.
        const errs = lines.filter((l) => l.kind === "err");
        if (errs.length) deps.print(errs);
        buffer.push(...lines.filter((l) => l.kind !== "err"));
      };

      code = await runStage(resolveArgv(stage), stdin, sink, buffered);

      if (stage.redirect) {
        const text = buffer.map((l) => l.text).join("\n") + (buffer.length ? "\n" : "");
        const target = normalize(session.cwd, expandTilde(stage.redirect.target, homeOf(deps.loggedIn())));
        try {
          const field = writeFile(target, text, auth(), stage.redirect.append);
          if (field) await deps.persistField(field);
        } catch (e) {
          deps.print([err(`zsh: ${stage.redirect.target}: ${e instanceof Error ? e.message : "write failed"}`)]);
          code = 1;
        }
        stdin = [];
      } else {
        stdin = buffer.map((l) => l.text);
      }
    }
    session.status = code;
  }
}
