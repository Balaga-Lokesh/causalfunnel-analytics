import { HeatmapView } from '@/components/heatmap/HeatmapView';
import { getPages } from '@/lib/api';

export const metadata = { title: 'Heatmap · Analytics Dashboard' };

export default async function HeatmapPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const [{ page }, { pages }] = await Promise.all([searchParams, getPages()]);

  // Fall back to the most-clicked page when none (or an unknown one) is selected.
  const selected = pages.find((p) => p.page_url === page)?.page_url ?? pages[0]?.page_url ?? null;

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Heatmap</h1>
      <p className="mt-1 text-sm text-zinc-600">Pick a page to see where visitors clicked.</p>

      {pages.length === 0 || !selected ? (
        <div className="mt-6 rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
          <h2 className="font-medium">No pages tracked yet</h2>
          <p className="mt-1 text-sm text-zinc-600">Click around the demo store, then come back.</p>
        </div>
      ) : (
        <HeatmapView pages={pages} initialPageUrl={selected} />
      )}
    </section>
  );
}
