import { useResumeField } from "../data/store";

export default function Footer() {
  const profile = useResumeField("profile");
  return (
    <footer className="border-t border-line py-6 font-mono text-2xs text-faint">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>
          &copy; {new Date().getFullYear()} {profile.name}
        </p>
        <p className="no-print">
          Press{" "}
          <kbd className="rounded-sm border border-line px-1 py-0.5 text-fg">
            Ctrl+`
          </kbd>{" "}
          for the shell,{" "}
          <kbd className="rounded-sm border border-line px-1 py-0.5 text-fg">
            &#8984;K
          </kbd>{" "}
          for commands,{" "}
          <kbd className="rounded-sm border border-line px-1 py-0.5 text-fg">j</kbd>{" "}
          /{" "}
          <kbd className="rounded-sm border border-line px-1 py-0.5 text-fg">k</kbd>{" "}
          to move between sections
        </p>
      </div>
    </footer>
  );
}
