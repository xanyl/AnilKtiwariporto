import { FiArrowUpRight, FiStar } from "react-icons/fi";
import Reveal from "../components/Reveal";
import Section from "../components/Section";
import languageColor from "../data/languageColors";
import { useResumeField } from "../data/store";
import type { GithubData } from "../hooks/useGithub";

function relative(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 1) return "today";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

interface Props {
  index: number;
  data: GithubData;
}

/** Live public GitHub activity. App only renders this once data has arrived. */
export default function Github({ index, data }: Props) {
  const profile = useResumeField("profile");

  const stats = [
    { value: String(data.repoCount), label: "Public Repos" },
    { value: String(data.followers), label: "Followers" },
    { value: data.since, label: "On GitHub Since" },
  ];

  return (
    <Section id="github" index={index} label="Open Source" className="no-print">
      <Reveal>
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-sm border border-line bg-line">
          {stats.map((s) => (
            <div key={s.label} className="bg-bg px-3 py-3">
              <dt className="sr-only">{s.label}</dt>
              <dd className="font-mono text-base tabular-nums text-accent">
                {s.value}
              </dd>
              <p className="mt-1 font-mono text-2xs tracking-wide text-faint">
                {s.label}
              </p>
            </div>
          ))}
        </dl>
      </Reveal>

      <ul className="mt-5 divide-y divide-line border-y border-line">
        {data.repos.map((repo, i) => (
          <Reveal key={repo.name} delay={Math.min(i, 5) * 0.03}>
            <li>
              <a
                href={repo.url}
                target="_blank"
                rel="noreferrer noopener"
                className="group flex items-baseline gap-3 py-2.5"
              >
                <span className="min-w-0 flex-1">
                  <span className="font-mono text-sm text-fg group-hover:text-accent">
                    {repo.name}
                  </span>
                  {repo.description && (
                    <span className="ml-2 text-2xs text-faint">
                      {repo.description}
                    </span>
                  )}
                </span>

                <span className="flex shrink-0 items-center gap-3 font-mono text-2xs text-faint">
                  {repo.language && (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: languageColor(repo.language) }}
                      />
                      {repo.language}
                    </span>
                  )}
                  {repo.stars > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <FiStar size={11} /> {repo.stars}
                    </span>
                  )}
                  <span className="hidden tabular-nums sm:inline">
                    {relative(repo.pushedAt)}
                  </span>
                </span>
              </a>
            </li>
          </Reveal>
        ))}
      </ul>

      <Reveal>
        <a
          href={profile.github}
          target="_blank"
          rel="noreferrer noopener"
          className="link-underline mt-4 inline-flex items-center gap-1.5 font-mono text-2xs text-muted hover:text-fg"
        >
          All repositories on GitHub <FiArrowUpRight size={12} />
        </a>
      </Reveal>
    </Section>
  );
}
