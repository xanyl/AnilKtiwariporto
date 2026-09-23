import { FiExternalLink } from "react-icons/fi";
import Reveal from "../components/Reveal";
import Section from "../components/Section";
import { publications } from "../data/resume";

export default function Publications({ index }: { index: number }) {
  return (
    <Section id="publications" index={index} label="publications">
      <ul className="space-y-4">
        {publications.map((p) => (
          <Reveal key={p.url} className="avoid-break">
            <li>
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer noopener"
                className="group block"
              >
                <h3 className="link-underline inline text-[0.95rem] leading-relaxed">
                  {p.title}
                </h3>
                <p className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-2xs text-faint transition-colors group-hover:text-accent">
                  {p.venue} <FiExternalLink size={11} />
                </p>
              </a>
            </li>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
