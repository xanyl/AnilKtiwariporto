import type { Session } from "./types";
import { HOSTNAME_STR, homeOf, pathStr, userOf } from "./vfs";

/** Variables a real shell would already have; user-set ones in session.env win. */
export function envList(session: Session, loggedIn: boolean): [string, string][] {
  const base: Record<string, string> = {
    USER: userOf(loggedIn),
    LOGNAME: userOf(loggedIn),
    HOME: pathStr(homeOf(loggedIn)),
    PWD: pathStr(session.cwd),
    SHELL: "/bin/zsh",
    TERM: "xterm-256color",
    LANG: "en_US.UTF-8",
    HOSTNAME: HOSTNAME_STR,
    EDITOR: "nano",
    PATH: "/usr/local/bin:/usr/bin:/bin:/usr/sbin",
    ...(session.oldpwd ? { OLDPWD: pathStr(session.oldpwd) } : {}),
  };
  return Object.entries({ ...base, ...session.env });
}

export function getVar(name: string, session: Session, loggedIn: boolean): string {
  if (name === "?") return String(session.status);
  return envList(session, loggedIn).find(([k]) => k === name)?.[1] ?? "";
}
