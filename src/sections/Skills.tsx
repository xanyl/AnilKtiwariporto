import Reveal from "../components/Reveal";
import Section from "../components/Section";
import Tag from "../components/Tag";
import { useResumeField } from "../data/store";

export default function Skills({ index }: { index: number }) {
  const skillGroups = useResumeField("skillGroups");
  return (
    <Section id="skills" index={index} label="skills">
      <div className="space-y-4">
        {skillGroups.map((group, i) => (
          <Reveal key={group.label} delay={i * 0.04} className="avoid-break">
            <div className="grid gap-3 sm:grid-cols-[11rem_1fr] sm:gap-6">
              <h3 className="font-mono text-2xs tracking-[0.12em] text-faint sm:pt-1.5">
                {group.label}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <Tag key={item} label={item} />
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
