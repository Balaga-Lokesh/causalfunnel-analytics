import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EventIcon } from '@/components/EventIcon';
import { LocalTime } from '@/components/LocalTime';
import { SampleBadge } from '@/components/SampleBadge';
import { ApiError, getSessionEvents } from '@/lib/api';
import { describeUserAgent, formatDuration, formatOffset, hostOf, isSampleSession, pathOf, shortId } from '@/lib/format';
import type { TrackedEvent } from '@/lib/types';

interface PageVisit {
  page_url: string;
  full_url?: string;
  /** The page_view that started this visit; absent if clicks arrived without one. */
  view?: TrackedEvent;
  clicks: TrackedEvent[];
}

/** Groups the flat event list into page visits: a page_view followed by its clicks. */
function groupIntoVisits(events: TrackedEvent[]): PageVisit[] {
  const visits: PageVisit[] = [];
  for (const event of events) {
    const current = visits.at(-1);
    if (event.event_type === 'page_view') {
      visits.push({ page_url: event.page_url, full_url: event.full_url, view: event, clicks: [] });
    } else if (current && current.page_url === event.page_url) {
      current.clicks.push(event);
    } else {
      visits.push({ page_url: event.page_url, full_url: event.full_url, clicks: [event] });
    }
  }
  return visits;
}

export async function generateMetadata({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return { title: `Session ${shortId(decodeURIComponent(sessionId))} · Analytics Dashboard` };
}

async function loadSession(sessionId: string) {
  try {
    return await getSessionEvents(sessionId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export default async function SessionDetailPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = await loadSession(decodeURIComponent(sessionId));

  const { events } = session;
  const visits = groupIntoVisits(events);
  const clicks = events.filter((e) => e.event_type === 'click').length;
  const durationMs = new Date(session.last_seen).getTime() - new Date(session.first_seen).getTime();
  const firstViewport = events.find((e) => e.viewport_width);

  return (
    <section>
      <Link href="/sessions" className="text-sm font-medium text-indigo-600 hover:underline">
        ← All sessions
      </Link>

      <header className="mt-3">
        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
          User journey {isSampleSession(session.session_id) && <SampleBadge />}
        </h1>
        <p className="mt-1 font-mono text-sm break-all text-zinc-500">{session.session_id}</p>
      </header>

      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 text-sm sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Started">
          <LocalTime iso={session.first_seen} />
        </Stat>
        <Stat label="Duration">{formatDuration(durationMs)}</Stat>
        <Stat label="Events">{session.total_events}</Stat>
        <Stat label="Page views">{visits.filter((v) => v.view).length}</Stat>
        <Stat label="Clicks">{clicks}</Stat>
        <Stat label="Browser">
          {describeUserAgent(session.user_agent)}
          {firstViewport && (
            <span className="block text-xs font-normal text-zinc-500">
              {firstViewport.viewport_width}×{firstViewport.viewport_height} viewport
            </span>
          )}
        </Stat>
      </dl>

      {session.truncated && (
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This session is very long; only the first {events.length} events are shown.
        </p>
      )}

      <h2 className="mt-10 text-sm font-semibold tracking-wide text-zinc-500 uppercase">
        Timeline · {visits.length} {visits.length === 1 ? 'page' : 'pages'} visited
      </h2>

      <ol className="mt-4 space-y-4">
        {visits.map((visit, i) => (
          <li key={visit.view?._id ?? visit.clicks[0]?._id ?? i} className="relative pl-10">
            {/* Connector line between steps */}
            {i < visits.length - 1 && (
              <span aria-hidden="true" className="absolute top-8 bottom-[-1rem] left-[15px] w-px bg-zinc-200" />
            )}
            <span
              aria-hidden="true"
              className="absolute top-1 left-0 flex size-8 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700 ring-4 ring-zinc-50"
            >
              {i + 1}
            </span>

            <article className="rounded-lg border border-zinc-200 bg-white shadow-xs">
              <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-zinc-100 px-4 py-3">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 font-medium">
                    <EventIcon type="page_view" className="size-4 shrink-0 text-indigo-600" />
                    <span className="truncate" title={visit.full_url ?? visit.page_url}>
                      {pathOf(visit.page_url)}
                    </span>
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {visit.view ? 'Page view' : 'Clicks without a page view'} · {hostOf(visit.page_url)}
                    {visit.view?.referrer && ` · from ${pathOf(visit.view.referrer)}`}
                  </p>
                </div>
                {visit.view && <EventTime event={visit.view} start={session.first_seen} />}
              </header>

              {visit.clicks.length > 0 ? (
                <ul className="divide-y divide-zinc-100">
                  {visit.clicks.map((click) => (
                    <li key={click._id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <EventIcon type="click" className="size-4 shrink-0 text-rose-500" />
                        <span className="truncate">
                          Clicked <span className="font-medium">{click.target ?? 'element'}</span>
                        </span>
                        <span className="shrink-0 font-mono text-xs text-zinc-400">
                          ({click.x}, {click.y})
                        </span>
                      </span>
                      <EventTime event={click} start={session.first_seen} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-2 text-sm text-zinc-400">No clicks on this page.</p>
              )}

              <footer className="border-t border-zinc-100 px-4 py-2 text-right">
                <Link
                  href={`/heatmap?page=${encodeURIComponent(visit.page_url)}`}
                  className="text-xs font-medium text-indigo-600 hover:underline"
                >
                  View page heatmap →
                </Link>
              </footer>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-1 font-semibold text-zinc-900">{children}</dd>
    </div>
  );
}

function EventTime({ event, start }: { event: TrackedEvent; start: string }) {
  return (
    <span className="shrink-0 text-xs whitespace-nowrap text-zinc-500 tabular-nums">
      <LocalTime iso={event.timestamp} mode="time" />
      <span className="ml-2 text-zinc-400">{formatOffset(start, event.timestamp)}</span>
    </span>
  );
}
