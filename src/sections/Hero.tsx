import { FiDownload, FiGithub, FiLinkedin, FiMail, FiPhone, FiTerminal } from "react-icons/fi";
import Reveal from "../components/Reveal";
import TypeLine from "../components/TypeLine";
import { useResumeField } from "../data/store";

const linkClass =
  "inline-flex items-center gap-2 rounded-sm border border-line px-3 py-2 font-mono text-2xs text-muted transition-colors hover:border-accent/60 hover:text-fg";

export default function Hero({ onOpenTerminal }: { onOpenTerminal: () => void }) {
  const profile = useResumeField("profile");
  return (
    <div id="top" className="relative scroll-mt-20 pb-2 pt-8 sm:pt-12">
      <div
        aria-hidden
        className="grid-field pointer-events-none absolute inset-x-0 -top-12 h-[18rem]"
      />

      <div className="relative">
        <Reveal>
          <div className="flex items-center gap-4">
            <img
              src="/assets/anil.JPG"
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 rounded-full border border-line object-cover"
            />
            <div className="min-w-0">
              <h1 className="font-mono text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">
                {profile.name}
              </h1>
              <p className="mt-1 font-mono text-2xs tracking-[0.14em] text-faint">
                {profile.location}
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="mt-5">
            <TypeLine words={profile.roles} />
          </div>
        </Reveal>

        <Reveal delay={0.14}>
          <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-2xs text-faint">
            <li>
              <a
                href={`mailto:${profile.email}`}
                className="link-underline inline-flex items-center gap-1.5 hover:text-fg"
              >
                <FiMail size={12} /> {profile.email}
              </a>
            </li>
            <li>
              <a
                href={`tel:${profile.phoneHref}`}
                className="link-underline inline-flex items-center gap-1.5 hover:text-fg"
              >
                <FiPhone size={12} /> {profile.phone}
              </a>
            </li>
          </ul>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="no-print mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenTerminal}
              className="inline-flex items-center gap-2 rounded-sm border border-accent/60 bg-accent/10 px-3 py-2 font-mono text-2xs text-accent transition-colors hover:bg-accent/20"
            >
              <FiTerminal size={13} /> Explore in terminal
            </button>
            <a href={profile.resume} download className={linkClass}>
              <FiDownload size={13} /> Resume
            </a>
            <a
              href={profile.github}
              target="_blank"
              rel="noreferrer noopener"
              className={linkClass}
            >
              <FiGithub size={13} /> {profile.githubLabel}
            </a>
            <a
              href={profile.linkedin}
              target="_blank"
              rel="noreferrer noopener"
              className={linkClass}
            >
              <FiLinkedin size={13} /> {profile.linkedinLabel}
            </a>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
