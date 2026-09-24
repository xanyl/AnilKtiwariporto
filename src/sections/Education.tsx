import Reveal from "../components/Reveal";
import Section from "../components/Section";
import { useResumeField } from "../data/store";

export default function Education({ index }: { index: number }) {
  const education = useResumeField("education");
  return (
    <Section id="education" index={index} label="education">
      <div className="space-y-6">
        {education.map((e) => (
          <Reveal key={e.school} className="avoid-break">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
              <div>
                <h3 className="font-mono text-base font-medium">{e.degree}</h3>
                <p className="mt-1 text-[0.9rem] text-muted">{e.school}</p>
              </div>
              <p className="shrink-0 font-mono text-2xs tabular-nums text-faint">
                {e.detail}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
