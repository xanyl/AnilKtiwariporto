import { useEffect, useState } from "react";

export interface Repo {
  name: string;
  url: string;
  description: string | null;
  language: string | null;
  stars: number;
  pushedAt: string;
}

export interface GithubData {
  repoCount: number;
  followers: number;
  since: string;
  repos: Repo[];
}

const USER = "xanyl";
const CACHE_KEY = "akt-github";
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h — the public API is rate-limited per IP.
const MAX_REPOS = 6;

function readCache(): GithubData | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { at, data } = JSON.parse(raw);
    return Date.now() - at < CACHE_TTL ? (data as GithubData) : null;
  } catch {
    return null;
  }
}

/**
 * Pulls public profile + recently pushed original repos.
 * Returns null on any failure so the section can simply not render.
 */
export default function useGithub() {
  const [data, setData] = useState<GithubData | null>(readCache);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (data) return;
    const controller = new AbortController();

    (async () => {
      try {
        const [userRes, repoRes] = await Promise.all([
          fetch(`https://api.github.com/users/${USER}`, { signal: controller.signal }),
          fetch(
            `https://api.github.com/users/${USER}/repos?sort=pushed&per_page=100`,
            { signal: controller.signal }
          ),
        ]);
        if (!userRes.ok || !repoRes.ok) throw new Error("github request failed");

        const user = await userRes.json();
        const raw = await repoRes.json();

        const repos: Repo[] = (Array.isArray(raw) ? raw : [])
          .filter((r) => !r.fork && !r.archived)
          .slice(0, MAX_REPOS)
          .map((r) => ({
            name: r.name,
            url: r.html_url,
            description: r.description,
            language: r.language,
            stars: r.stargazers_count,
            pushedAt: r.pushed_at,
          }));

        const next: GithubData = {
          repoCount: user.public_repos ?? 0,
          followers: user.followers ?? 0,
          since: String(user.created_at ?? "").slice(0, 4),
          repos,
        };

        setData(next);
        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ at: Date.now(), data: next })
          );
        } catch {
          /* private mode: just refetch next load */
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") setFailed(true);
      }
    })();

    return () => controller.abort();
  }, [data]);

  return { data, failed };
}
