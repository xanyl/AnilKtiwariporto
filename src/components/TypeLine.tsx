import { useEffect, useState } from "react";
import useReducedMotion from "../hooks/useReducedMotion";

const TYPE_MS = 65;
const ERASE_MS = 35;
const HOLD_MS = 1600;

/** Cycles through role strings with a block cursor. Static when motion is reduced. */
export default function TypeLine({ words }: { words: string[] }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [len, setLen] = useState(0);
  const [erasing, setErasing] = useState(false);

  const word = words[index] ?? "";

  useEffect(() => {
    if (reduced) return;

    if (!erasing && len === word.length) {
      const t = setTimeout(() => setErasing(true), HOLD_MS);
      return () => clearTimeout(t);
    }
    if (erasing && len === 0) {
      setErasing(false);
      setIndex((i) => (i + 1) % words.length);
      return;
    }
    const t = setTimeout(
      () => setLen((l) => l + (erasing ? -1 : 1)),
      erasing ? ERASE_MS : TYPE_MS
    );
    return () => clearTimeout(t);
  }, [reduced, erasing, len, word, words.length]);

  const text = reduced ? words[0] : word.slice(0, len);

  return (
    <p className="font-mono text-sm text-muted sm:text-base">
      <span className="text-accent">&gt;</span> {text}
      {!reduced && (
        <span
          aria-hidden
          className="ml-0.5 inline-block h-[1em] w-[0.55em] translate-y-[0.12em] animate-pulse bg-accent"
        />
      )}
    </p>
  );
}
