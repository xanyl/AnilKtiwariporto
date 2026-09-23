export type LineKind = "out" | "dim" | "accent" | "err" | "input" | "art";

export interface Line {
  kind: LineKind;
  text: string;
}

export const out = (text = ""): Line => ({ kind: "out", text });
export const dim = (text = ""): Line => ({ kind: "dim", text });
export const accent = (text = ""): Line => ({ kind: "accent", text });
export const err = (text = ""): Line => ({ kind: "err", text });
export const art = (text = ""): Line => ({ kind: "art", text });

export interface CommandContext {
  print: (lines: Line[]) => void;
  clear: () => void;
  close: () => void;
  setTheme: (t: "dark" | "light") => void;
  theme: "dark" | "light";
}

export interface Command {
  name: string;
  summary: string;
  usage?: string;
  /** Completions for the first argument. */
  args?: () => string[];
  run: (argv: string[], ctx: CommandContext) => Line[] | void;
}
