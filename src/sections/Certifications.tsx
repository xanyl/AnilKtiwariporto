import { FiExternalLink, FiFileText } from "react-icons/fi";
import Reveal from "../components/Reveal";
import Section from "../components/Section";
import { safeHref } from "../data/sanitize";
import { useResumeField } from "../data/store";

export default function Certifications({ index }: { index: number }) {
  const certificates = useResumeField("certificates");
  return (
    <Section id="certifications" index={index} label="certifications">
      <ul className="divide-y divide-line border-y border-line">
        {certificates.map((c, i) => (
          <Reveal key={c.title} delay={Math.min(i, 5) * 0.03}>
            <li className="avoid-break flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
              <div className="min-w-0">
                <h3 className="text-[0.9rem] leading-snug">{c.title}</h3>
                <p className="mt-0.5 font-mono text-2xs text-faint">
                  {c.issuer}
                  {c.credentialId && (
                    <span className="hidden sm:inline"> &middot; id {c.credentialId}</span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 font-mono text-2xs tabular-nums text-faint">
                <span>{c.issued}</span>
                {c.file && (
                  <a
                    href={safeHref(c.file)}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`Open certificate: ${c.title}`}
                    className="no-print transition-colors hover:text-accent"
                  >
                    <FiFileText size={13} />
                  </a>
                )}
                {c.verificationUrl && (
                  <a
                    href={safeHref(c.verificationUrl)}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`Verify certificate: ${c.title}`}
                    className="no-print transition-colors hover:text-accent"
                  >
                    <FiExternalLink size={13} />
                  </a>
                )}
              </div>
            </li>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
