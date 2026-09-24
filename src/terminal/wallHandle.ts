const HANDLE_KEY = "shell_wall_handle";

/** A stable per-browser display name for the guestbook, so returning visitors keep their handle. */
export function getWallHandle(): string {
  try {
    const stored = localStorage.getItem(HANDLE_KEY);
    if (stored) return stored;
    const generated = `guest-${Math.random().toString(36).slice(2, 6)}`;
    localStorage.setItem(HANDLE_KEY, generated);
    return generated;
  } catch {
    return "guest";
  }
}

export function setWallHandle(name: string) {
  try {
    localStorage.setItem(HANDLE_KEY, name);
  } catch {
    /* storage unavailable — handle just won't persist across reloads */
  }
}
