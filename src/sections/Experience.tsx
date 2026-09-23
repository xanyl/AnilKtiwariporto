import Reveal from "../components/Reveal";
import Section from "../components/Section";
import Tag from "../components/Tag";
import { experience } from "../data/resume";

export default function Experience({ index }: { index: number }) {
  return (
    <Section id="experience" index={index} label="experience">
      <ol className="relative border-l border-line pl-6 sm:pl-8">
        {experience.map((job, i) => (
          <li key={job.org} className={`avoid-break relative ${i > 0 ? "mt-8" : ""}`}>
            <span
              aria-hidden
              className="absolute -left-[1.68rem] top-1.5 h-2 w-2 rounded-full border border-accent bg-bg sm:-left-[2.18rem]"
            />
            <Reveal>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <h3 className="font-mono text-base font-medium">
                  {job.role}{" "}
                  <span className="text-faint">@</span>{" "}
                  <span className="text-accent">{job.org}</span>
                </h3>
                <p className="shrink-0 font-mono text-2xs tabular-nums text-faint">
                  {job.start} &mdash; {job.end}
                </p>
              </div>

              <ul className="print-tight mt-3 space-y-2">
                {job.bullets.map((b) => (
                  <li
                    key={b}
                    className="relative pl-4 text-[0.9rem] leading-relaxed text-muted before:absolute before:left-0 before:text-accent before:content-['\2013']"
                  >
                    {b}
                  </li>
                ))}
              </ul>

              <div className="print-hide mt-3 flex flex-wrap gap-1.5">
                {job.stack.map((s) => (
                  <Tag key={s} label={s} />
                ))}
              </div>
            </Reveal>
          </li>
        ))}
      </ol>
    </Section>
  );
}
