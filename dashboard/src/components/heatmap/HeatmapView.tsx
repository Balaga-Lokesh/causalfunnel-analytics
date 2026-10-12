'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useState } from 'react';
import { getPageClicks } from '@/lib/api';
import { deviceFromViewport, hostOf, pathOf, plural } from '@/lib/format';
import type { PageClicksResponse, PageSummary } from '@/lib/types';
import { HeatmapCanvas, type RenderMode } from './HeatmapCanvas';
import { computeLayout, filterByDevice, topTargets, type DeviceFilter } from './layout';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: PageClicksResponse };

const DEVICE_OPTIONS: { value: DeviceFilter; label: string }[] = [
  { value: 'all', label: 'All devices' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'mobile', label: 'Mobile' },
];

export function HeatmapView({ pages, initialPageUrl }: { pages: PageSummary[]; initialPageUrl: string }) {
  const router = useRouter();
  const selectId = useId();
  const [pageUrl, setPageUrl] = useState(initialPageUrl);
  const [device, setDevice] = useState<DeviceFilter>('all');
  const [mode, setMode] = useState<RenderMode>('dots');
  const [showPage, setShowPage] = useState(true);
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    getPageClicks(pageUrl)
      .then((data) => !cancelled && setState({ status: 'ready', data }))
      .catch((err: unknown) => !cancelled && setState({ status: 'error', message: String(err) }));
    return () => {
      cancelled = true;
    };
  }, [pageUrl, reloadKey]);

  const clicks = state.status === 'ready' ? state.data.clicks : [];
  const filtered = useMemo(() => filterByDevice(clicks, device), [clicks, device]);
  const layout = useMemo(() => computeLayout(filtered), [filtered]);
  const targets = useMemo(() => topTargets(filtered), [filtered]);

  const deviceCounts = useMemo(() => {
    const counts: Record<DeviceFilter, number> = { all: clicks.length, desktop: 0, tablet: 0, mobile: 0 };
    for (const c of clicks) {
      const d = deviceFromViewport(c.viewport_width ?? c.page_width);
      if (d) counts[d]++;
    }
    return counts;
  }, [clicks]);

  function selectPage(url: string) {
    setPageUrl(url);
    // Keep the selection in the URL so the view can be shared or bookmarked.
    router.replace(`/heatmap?page=${encodeURIComponent(url)}`, { scroll: false });
  }

  const selectedPage = pages.find((p) => p.page_url === pageUrl);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="min-w-0 space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-xs">
          <div className="min-w-0 flex-1 basis-64">
            <label htmlFor={selectId} className="block text-xs font-medium text-zinc-500">
              Page
            </label>
            <select
              id={selectId}
              value={pageUrl}
              onChange={(e) => selectPage(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            >
              {pages.map((p) => (
                <option key={p.page_url} value={p.page_url}>
                  {pathOf(p.page_url)} ({hostOf(p.page_url)}) · {plural(p.clicks, 'click')} · {plural(p.page_views, 'view')}
                </option>
              ))}
            </select>
          </div>

          <SegmentedControl
            legend="Device"
            value={device}
            onChange={setDevice}
            options={DEVICE_OPTIONS.map((o) => ({ ...o, label: `${o.label} (${deviceCounts[o.value]})` }))}
          />

          <SegmentedControl
            legend="Display"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'dots', label: 'Dots' },
              { value: 'heat', label: 'Heat' },
            ]}
          />

          <label className="flex items-center gap-2 pb-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={showPage}
              onChange={(e) => setShowPage(e.target.checked)}
              className="size-4 rounded border-zinc-300 accent-indigo-600"
            />
            Show page
          </label>
        </div>

        {/* Visualization */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-xs">
          {state.status === 'error' ? (
            <div role="alert" className="py-12 text-center text-sm text-red-700">
              Couldn&apos;t load clicks for this page.
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="ml-2 font-medium text-indigo-600 hover:underline"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm text-zinc-600" aria-live="polite">
                {state.status === 'loading' ? (
                  'Loading clicks…'
                ) : (
                  <>
                    Showing <span className="font-semibold text-zinc-900">{filtered.length}</span> of{' '}
                    {state.data.total} clicks
                    {state.data.truncated && ' (most recent only)'}
                  </>
                )}
              </p>
              <HeatmapCanvas
                layout={layout}
                pageUrl={pageUrl}
                mode={mode}
                showPage={showPage}
                label={`${filtered.length} clicks on ${pathOf(pageUrl)}`}
              />
              {state.status === 'ready' && filtered.length === 0 && (
                <p className="mt-3 text-center text-sm text-zinc-500">
                  No clicks recorded {device === 'all' ? 'on this page' : `from ${device} devices`} yet.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sidebar: page stats and the text alternative to the heatmap */}
      <aside className="space-y-4">
        {selectedPage && (
          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 text-center lg:grid-cols-1 lg:text-left">
            <SidebarStat label="Page views" value={selectedPage.page_views} />
            <SidebarStat label="Clicks" value={selectedPage.clicks} />
            <SidebarStat label="Sessions" value={selectedPage.sessions} />
          </dl>
        )}

        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-xs">
          <h2 className="text-sm font-semibold">Most clicked elements</h2>
          {targets.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">Nothing yet.</p>
          ) : (
            <ol className="mt-3 space-y-3">
              {targets.map((t) => (
                <li key={t.target} className="text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="truncate" title={t.target}>
                      {t.target}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">{t.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-zinc-100" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-rose-400"
                      style={{ width: `${(t.count / targets[0]!.count) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </aside>
    </div>
  );
}

function SegmentedControl<T extends string>({
  legend,
  value,
  onChange,
  options,
}: {
  legend: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="text-xs font-medium text-zinc-500">{legend}</legend>
      <div className="mt-1 inline-flex flex-wrap rounded-md border border-zinc-300 bg-zinc-50 p-0.5 text-sm">
        {options.map((o) => (
          <label
            key={o.value}
            className="cursor-pointer rounded px-2.5 py-1 whitespace-nowrap text-zinc-600 has-checked:bg-white has-checked:font-medium has-checked:text-zinc-900 has-checked:shadow-xs has-focus-visible:ring-2 has-focus-visible:ring-indigo-500"
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SidebarStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
