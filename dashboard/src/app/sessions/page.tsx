import Link from 'next/link';
import { LocalTime } from '@/components/LocalTime';
import { RefreshButton } from '@/components/RefreshButton';
import { getSessions } from '@/lib/api';
import { describeUserAgent, formatDuration, pathOf, plural, shortId } from '@/lib/format';

const PAGE_SIZE = 25;

export const metadata = { title: 'Sessions · Analytics Dashboard' };

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1);
  const { sessions, total } = await getSessions({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {plural(total, 'session')} tracked. Open one to see the user journey.
          </p>
        </div>
        <RefreshButton />
      </div>

      {sessions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="data-table-wrapper mt-6 rounded-lg border border-zinc-200 bg-white shadow-xs">
          <table className="data-table text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
              <tr>
                <th scope="col" className="border-b border-zinc-200 px-4 py-3">Session</th>
                <th scope="col" className="border-b border-zinc-200 px-4 py-3">Last active</th>
                <th scope="col" className="border-b border-zinc-200 px-4 py-3 text-right">Events</th>
                <th scope="col" className="border-b border-zinc-200 px-4 py-3 text-right">Pages</th>
                <th scope="col" className="border-b border-zinc-200 px-4 py-3 text-right">Duration</th>
                <th scope="col" className="border-b border-zinc-200 px-4 py-3">Journey</th>
                <th scope="col" className="border-b border-zinc-200 px-4 py-3">Browser</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sessions.map((s) => {
                const href = `/sessions/${encodeURIComponent(s.session_id)}`;
                return (
                  <tr key={s.session_id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <Link
                        href={href}
                        className="font-mono font-medium text-indigo-600 hover:underline"
                        title={s.session_id}
                      >
                        {shortId(s.session_id)}
                      </Link>
                    </td>
                    <td data-label="Last active" className="px-4 py-3 whitespace-nowrap text-zinc-600">
                      <LocalTime iso={s.last_seen} mode="relative" />
                    </td>
                    <td data-label="Events" className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                      <span>
                        <span className="font-semibold text-zinc-900">{s.total_events}</span>
                        <span className="ml-2 text-xs text-zinc-500">
                          {s.page_views} views · {s.clicks} clicks
                        </span>
                      </span>
                    </td>
                    <td data-label="Pages" className="px-4 py-3 text-right tabular-nums">
                      {s.unique_pages}
                    </td>
                    <td data-label="Duration" className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                      {formatDuration(s.duration_ms)}
                    </td>
                    <td data-label="Journey" className="max-w-xs px-4 py-3 text-zinc-600">
                      <span className="truncate" title={`${s.entry_page} → ${s.exit_page}`}>
                        {pathOf(s.entry_page)}
                        {s.exit_page !== s.entry_page && (
                          <>
                            <span className="mx-1 text-zinc-400">→</span>
                            {pathOf(s.exit_page)}
                          </>
                        )}
                      </span>
                    </td>
                    <td data-label="Browser" className="px-4 py-3 whitespace-nowrap text-zinc-600">
                      {describeUserAgent(s.user_agent)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {total > PAGE_SIZE && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm text-zinc-600">
          <p>
            Showing <span className="font-medium">{from}</span>–<span className="font-medium">{to}</span> of{' '}
            <span className="font-medium">{total}</span>
          </p>
          <div className="flex gap-2">
            <PageLink page={page - 1} disabled={page <= 1}>
              ← Previous
            </PageLink>
            <PageLink page={page + 1} disabled={page >= totalPages}>
              Next →
            </PageLink>
          </div>
        </nav>
      )}
    </section>
  );
}

function PageLink({ page, disabled, children }: { page: number; disabled: boolean; children: React.ReactNode }) {
  const className = 'rounded-md border border-zinc-300 bg-white px-3 py-1.5 font-medium';
  if (disabled) {
    return <span className={`${className} cursor-not-allowed opacity-50`}>{children}</span>;
  }
  return (
    <Link href={`/sessions?page=${page}`} className={`${className} hover:bg-zinc-50`}>
      {children}
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="mt-6 rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
      <h2 className="font-medium">No sessions yet</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Open the demo store and click around. Sessions show up here as soon as events arrive.
      </p>
    </div>
  );
}
