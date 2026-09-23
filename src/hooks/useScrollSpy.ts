import { useEffect, useState } from "react";

/**
 * Tracks which section id is currently closest to the top of the viewport.
 * One observer for all sections rather than one per section.
 */
export default function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState<string>(ids[0] ?? "");

  useEffect(() => {
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((n): n is HTMLElement => n !== null);
    if (nodes.length === 0) return;

    const visible = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.boundingClientRect.top);
          } else {
            visible.delete(entry.target.id);
          }
        }
        if (visible.size === 0) return;
        // The entry nearest the top edge wins.
        const next = [...visible.entries()].sort(
          (a, b) => Math.abs(a[1]) - Math.abs(b[1])
        )[0][0];
        setActive(next);
      },
      { rootMargin: "-88px 0px -55% 0px", threshold: 0 }
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}
