import { deviceFromViewport, type DeviceClass } from '@/lib/format';
import type { ClickPoint } from '@/lib/types';

export type DeviceFilter = 'all' | DeviceClass;

export interface HeatmapLayout {
  /** Width (CSS px) of the page the points are mapped onto. */
  width: number;
  /** Height (CSS px) of the page area to draw. */
  height: number;
  /** Click positions in the reference layout's coordinates. */
  points: { x: number; y: number }[];
}

const DEFAULT_WIDTH = 1280;
const MIN_HEIGHT = 480;
const MAX_HEIGHT = 6000;

export function filterByDevice(clicks: ClickPoint[], device: DeviceFilter): ClickPoint[] {
  if (device === 'all') return clicks;
  return clicks.filter((c) => deviceFromViewport(c.viewport_width ?? c.page_width) === device);
}

function mostCommon(values: number[]): number | undefined {
  const counts = new Map<number, number>();
  let best: number | undefined;
  let bestCount = 0;
  for (const v of values) {
    const n = (counts.get(v) ?? 0) + 1;
    counts.set(v, n);
    if (n > bestCount) {
      best = v;
      bestCount = n;
    }
  }
  return best;
}

/**
 * Maps clicks recorded on different screen sizes onto one reference layout.
 *
 * x is scaled proportionally to the page width at click time (layouts are
 * usually centered/fluid horizontally); y is kept in absolute pixels because
 * content flows from the top. This is an approximation: responsive layouts
 * that reflow heavily will still drift, which is why the view can also be
 * filtered by device class.
 */
export function computeLayout(clicks: ClickPoint[]): HeatmapLayout {
  const width = mostCommon(clicks.map((c) => c.page_width).filter((w): w is number => !!w)) ?? DEFAULT_WIDTH;

  const points = clicks.map((c) => ({
    x: c.page_width ? (c.x / c.page_width) * width : c.x,
    y: c.y,
  }));

  const recordedHeight = Math.max(
    0,
    ...clicks.filter((c) => c.page_width === width && c.page_height).map((c) => c.page_height!),
  );
  const lowestClick = Math.max(0, ...points.map((p) => p.y));
  const height = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, recordedHeight, lowestClick + 80));

  return { width, height, points };
}

export interface TargetCount {
  target: string;
  count: number;
}

/** Most-clicked elements: a text alternative to the visual heatmap. */
export function topTargets(clicks: ClickPoint[], limit = 8): TargetCount[] {
  const counts = new Map<string, number>();
  for (const c of clicks) {
    const key = c.target ?? '(unknown element)';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts]
    .map(([target, count]) => ({ target, count }))
    .sort((a, b) => b.count - a.count || a.target.localeCompare(b.target))
    .slice(0, limit);
}
