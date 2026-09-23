import { useEffect } from "react";

const NEXT = new Set(["j", "ArrowDown"]);
const PREV = new Set(["k", "ArrowUp"]);

/** j / k (or arrows) jump between sections. Ignored while typing or with modifiers. */
export default function useKeyboardNav(ids: string[], active: string) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      const forward = NEXT.has(e.key);
      const backward = PREV.has(e.key);
      if (!forward && !backward) return;

      const order = ["top", ...ids];
      const i = order.indexOf(active);
      const next = order[Math.min(order.length - 1, Math.max(0, i + (forward ? 1 : -1)))];
      if (!next || next === active) return;

      e.preventDefault();
      document.getElementById(next)?.scrollIntoView({ block: "start" });
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ids, active]);
}
