import { FiGithub, FiLinkedin, FiMail } from "react-icons/fi";
import Reveal from "../components/Reveal";
import Section from "../components/Section";
import { safeHref } from "../data/sanitize";
import { useResumeField } from "../data/store";

export default function Contact({ index }: { index: number }) {
  const profile = useResumeField("profile");
  const links = [
    { icon: FiMail, label: profile.email, href: `mailto:${profile.email}` },
    { icon: FiLinkedin, label: profile.linkedinLabel, href: safeHref(profile.linkedin) },
    { icon: FiGithub, label: profile.githubLabel, href: safeHref(profile.github) },
  ];
  return (
    <Section id="contact" index={index} label="contact">
      <Reveal>
        <p className="max-w-xl text-[0.95rem] leading-relaxed text-muted">
          Open to data engineering and ML roles, research collaboration, and
          interesting pipeline problems.
        </p>
        <ul className="mt-5 space-y-2">
          {links.map(({ icon: Icon, label, href }) => (
            <li key={href}>
              <a
                href={href}
                target={href.startsWith("mailto:") ? undefined : "_blank"}
                rel="noreferrer noopener"
                className="link-underline inline-flex items-center gap-2.5 font-mono text-sm text-muted transition-colors hover:text-fg"
              >
                <Icon size={14} className="text-accent" />
                {label}
              </a>
            </li>
          ))}
        </ul>
      </Reveal>
    </Section>
  );
}
