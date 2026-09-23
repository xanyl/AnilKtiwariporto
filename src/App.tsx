import { useCallback, useEffect, useMemo, useState } from "react";
import CommandPalette from "./components/CommandPalette";
import Terminal from "./components/Terminal";
import TopBar from "./components/nav/TopBar";
import { sections } from "./data/resume";
import useGithub from "./hooks/useGithub";
import useKeyboardNav from "./hooks/useKeyboardNav";
import useScrollSpy from "./hooks/useScrollSpy";
import useTheme from "./hooks/useTheme";
import Certifications from "./sections/Certifications";
import Contact from "./sections/Contact";
import Education from "./sections/Education";
import Experience from "./sections/Experience";
import Footer from "./sections/Footer";
import Github from "./sections/Github";
import Hero from "./sections/Hero";
import Projects from "./sections/Projects";
import Publications from "./sections/Publications";
import Skills from "./sections/Skills";
import Summary from "./sections/Summary";

export default function App() {
  const { theme, setTheme, toggle } = useTheme();
  const [terminalOpen, setTerminalOpen] = useState(false);
  const { data: github } = useGithub();

  // Open Source only exists when GitHub actually answered, so the nav,
  // the scroll-spy and the section numbering all key off the same list.
  const visible = useMemo(
    () =>
      sections.filter(
        (s) => s.id !== "github" || (github !== null && github.repos.length > 0)
      ),
    [github]
  );
  const ids = useMemo(() => visible.map((s) => s.id), [visible]);
  const numberOf = useMemo(() => {
    const order = new Map(visible.map((s, i) => [s.id, i + 1]));
    return (id: string) => order.get(id) ?? 0;
  }, [visible]);

  const active = useScrollSpy(ids);
  useKeyboardNav(ids, active);

  const openTerminal = useCallback(() => setTerminalOpen(true), []);
  const closeTerminal = useCallback(() => setTerminalOpen(false), []);

  // Ctrl+` is the conventional "drop to shell" binding.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && (e.key === "`" || e.key === "~")) {
        e.preventDefault();
        setTerminalOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <a
        href="#summary"
        className="no-print sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-sm focus:border focus:border-accent focus:bg-bg focus:px-3 focus:py-2 focus:font-mono focus:text-2xs"
      >
        Skip to content
      </a>

      <TopBar
        sections={visible}
        active={active}
        theme={theme}
        onToggleTheme={toggle}
        onOpenTerminal={openTerminal}
      />
      <CommandPalette
        sections={visible}
        theme={theme}
        onToggleTheme={toggle}
        onOpenTerminal={openTerminal}
        suspended={terminalOpen}
      />
      <Terminal
        open={terminalOpen}
        onClose={closeTerminal}
        theme={theme}
        setTheme={setTheme}
      />

      <main className="mx-auto max-w-page px-5 sm:px-8">
        <Hero onOpenTerminal={openTerminal} />
        <Summary index={numberOf("summary")} />
        <Experience index={numberOf("experience")} />
        <Projects index={numberOf("projects")} />
        {github && <Github index={numberOf("github")} data={github} />}
        <Skills index={numberOf("skills")} />
        <Education index={numberOf("education")} />
        <Certifications index={numberOf("certifications")} />
        <Publications index={numberOf("publications")} />
        <Contact index={numberOf("contact")} />
        <Footer />
      </main>
    </>
  );
}
