const ALLOWED_SCHEMES = new Set(["http:", "https:", "mailto:", "tel:"]);

/**
 * Every link on the page is admin-editable through the terminal, so a
 * compromised session token could otherwise plant a `javascript:` URL that
 * runs in every visitor's browser. Parsed against location so bare
 * relative paths (e.g. "/") remain valid without special-casing them.
 */
export function safeHref(url: string | undefined | null): string {
  if (!url) return "#";
  try {
    const parsed = new URL(url, window.location.origin);
    return ALLOWED_SCHEMES.has(parsed.protocol) ? url : "#";
  } catch {
    return "#";
  }
}
