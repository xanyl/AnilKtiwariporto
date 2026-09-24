import { FiGithub } from "react-icons/fi";
import MetricStrip from "../components/Metric";
import Reveal from "../components/Reveal";
import Section from "../components/Section";
import Tag from "../components/Tag";
import { useResumeField } from "../data/store";

export default function Projects({ index }: { index: number }) {
  const projects = useResumeField("projects");
  return (
    <Section id="projects" index={index} label="projects">
      <div className="space-y-8">
        {projects.map((p, i) => (
          <Reveal key={p.name} className="avoid-break">
            <article>
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-2xs tabular-nums text-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-mono text-base font-medium">{p.name}</h3>
                {p.repo && (
                  <a
                    href={p.repo}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`${p.name} source on GitHub`}
                    className="no-print text-faint transition-colors hover:text-accent"
                  >
                    <FiGithub size={13} />
                  </a>
                )}
              </div>
              <p className="mt-1 pl-8 font-mono text-2xs text-faint">{p.blurb}</p>

              <ul className="print-tight mt-3 space-y-2 pl-8">
                {p.bullets.map((b) => (
                  <li
                    key={b}
                    className="relative pl-4 text-[0.9rem] leading-relaxed text-muted before:absolute before:left-0 before:text-accent before:content-['\2013']"
                  >
                    {b}
                  </li>
                ))}
              </ul>

              <div className="pl-8">
                <MetricStrip metrics={p.metrics} />
                <div className="print-hide mt-3 flex flex-wrap gap-1.5">
                  {p.stack.map((s) => (
                    <Tag key={s} label={s} />
                  ))}
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
