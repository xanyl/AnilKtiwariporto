import type { Metric as MetricData } from "../data/resume";

/** Pulls hard numbers out of prose so results read at a glance. */
export default function MetricStrip({ metrics }: { metrics: MetricData[] }) {
  return (
    <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-4">
      {metrics.map((m) => (
        <div key={m.label} className="bg-bg px-3 py-3">
          <dt className="sr-only">{m.label}</dt>
          <dd className="font-mono text-base tabular-nums text-accent">
            {m.value}
          </dd>
          <p className="mt-1 font-mono text-2xs tracking-wide text-faint">
            {m.label}
          </p>
        </div>
      ))}
    </dl>
  );
}
