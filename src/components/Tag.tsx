import { techIcon } from "../data/techIcons";

/**
 * A technology chip. Brand icons are looked up by label, so experience,
 * project and skill lists all get the same mark for the same tool.
 */
export default function Tag({ label }: { label: string }) {
  const tech = techIcon(label);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-surface px-2 py-1 font-mono text-2xs text-muted transition-colors hover:border-accent/50 hover:text-fg">
      {tech && (
        <tech.Icon
          size={12}
          aria-hidden
          className="shrink-0"
          style={tech.color ? { color: tech.color } : undefined}
        />
      )}
      {label}
    </span>
  );
}
