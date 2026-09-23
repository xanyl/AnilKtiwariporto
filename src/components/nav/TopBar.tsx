import { FiMoon, FiSun, FiTerminal } from "react-icons/fi";
import type { SectionMeta } from "../../data/resume";
import type { Theme } from "../../hooks/useTheme";

interface Props {
  sections: SectionMeta[];
  active: string;
  theme: Theme;
  onToggleTheme: () => void;
  onOpenTerminal: () => void;
}

export default function TopBar({ sections, active, theme, onToggleTheme, onOpenTerminal }: Props) {
  return (
    <header className="no-print sticky top-0 z-50 border-b border-line bg-bg/80 backdrop-blur-md">
      <nav
        aria-label="Sections"
        className="mx-auto flex h-12 max-w-page items-center gap-4 px-5 sm:px-8"
      >
        <a
          href="#top"
          className="shrink-0 whitespace-nowrap font-mono text-sm font-semibold tracking-tight"
        >
          Anil K<span className="text-accent">.</span> Tiwari
        </a>

        <ul className="scrollbar-none flex flex-1 items-center gap-1 overflow-x-auto">
          {sections.map((s) => {
            const isActive = active === s.id;
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`block whitespace-nowrap rounded-sm px-2 py-1 font-mono text-2xs transition-colors ${
                    isActive
                      ? "text-accent"
                      : "text-faint hover:text-fg"
                  }`}
                >
                  {s.label}
                </a>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={onOpenTerminal}
          aria-label="Open interactive terminal"
          title="Open terminal (Ctrl+`)"
          className="shrink-0 rounded-sm border border-line p-1.5 text-muted transition-colors hover:border-accent/50 hover:text-accent"
        >
          <FiTerminal size={14} />
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          className="shrink-0 rounded-sm border border-line p-1.5 text-muted transition-colors hover:border-accent/50 hover:text-fg"
        >
          {theme === "dark" ? <FiSun size={14} /> : <FiMoon size={14} />}
        </button>
      </nav>
    </header>
  );
}
