/** "1h 4m", "3m 12s", "8s", "<1s" */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 1000) return '<1s';
  const totalSeconds = Math.round(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** "+12s", "+3m 5s": offset from the start of a session. */
export function formatOffset(fromIso: string, toIso: string): string {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  return ms < 1000 ? '+0s' : `+${formatDuration(ms)}`;
}

const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "5 minutes ago", "yesterday" */
export function formatRelative(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return 'just now';
  if (abs < 3600) return relativeFormatter.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return relativeFormatter.format(Math.round(seconds / 3600), 'hour');
  return relativeFormatter.format(Math.round(seconds / 86400), 'day');
}

const SAMPLE_PREFIX = 'seed-';

/** Sessions created by the seed script (sample data), not by real visitors. */
export function isSampleSession(id: string): boolean {
  return id.startsWith(SAMPLE_PREFIX);
}

/** First block of a UUID, enough to tell sessions apart at a glance. */
export function shortId(id: string): string {
  const bare = isSampleSession(id) ? id.slice(SAMPLE_PREFIX.length) : id;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(bare)) return bare.slice(0, 8);
  return bare.length > 12 ? `${bare.slice(0, 12)}…` : bare;
}

/** Path part of a URL for compact display ("/demo/product"). */
export function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}` || '/';
  } catch {
    return url;
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

/** Very small user-agent summary: "Chrome · Windows". Good enough for a dashboard label. */
export function describeUserAgent(ua: string | null | undefined): string {
  if (!ua) return 'Unknown';

  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : /curl\//.test(ua)
              ? 'curl'
              : 'Other';

  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad|iPod/.test(ua)
        ? 'iOS'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : '';

  return os ? `${browser} · ${os}` : browser;
}

export type DeviceClass = 'mobile' | 'tablet' | 'desktop';

/** Device class from the viewport width at the time of the event. */
export function deviceFromViewport(width: number | undefined): DeviceClass | undefined {
  if (!width) return undefined;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/** "1 click", "3 clicks" */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
