/**
 * Normalizes a page URL so the same page groups together in the heatmap:
 * drops query string and hash, lower-cases the host, and treats
 * `/a/`, `/a`, `/a.html` and `/a/index.html` as the same page.
 *
 * Unparseable input is returned unchanged.
 */
export function normalizePageUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }

  let path = url.pathname
    .replace(/\/index\.html?$/i, '/')
    .replace(/\.html?$/i, '');
  if (path.length > 1) path = path.replace(/\/+$/, '');

  return `${url.protocol}//${url.host.toLowerCase()}${path || '/'}`;
}
