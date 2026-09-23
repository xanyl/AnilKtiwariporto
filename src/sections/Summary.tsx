import Reveal from "../components/Reveal";
import Section from "../components/Section";
import { summary } from "../data/resume";

export default function Summary({ index }: { index: number }) {
  return (
    <Section id="summary" index={index} label="summary">
      <Reveal>
        <p className="max-w-2xl text-[0.95rem] leading-relaxed text-muted">
          {summary}
        </p>
      </Reveal>
    </Section>
  );
}
