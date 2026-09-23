import Reveal from "./Reveal";

interface Props {
  id: string;
  index: number;
  label: string;
  children: React.ReactNode;
  className?: string;
}

/** Numbered section header + hairline rule, giving the page a document spine. */
export default function Section({ id, index, label, children, className = "" }: Props) {
  return (
    <section id={id} className={`scroll-mt-20 py-7 sm:py-9 ${className}`}>
      <Reveal>
        <div className="mb-5 flex items-baseline gap-3 border-b border-line pb-2.5">
          <span className="font-mono text-2xs tabular-nums text-faint">
            {String(index).padStart(2, "0")}
          </span>
          <h2 className="font-mono text-2xs tracking-[0.18em] text-muted">
            <span className="text-accent">//</span> {label}
          </h2>
        </div>
      </Reveal>
      {children}
    </section>
  );
}
