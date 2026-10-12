export default function Loading() {
  return (
    <section aria-busy="true" aria-label="Loading sessions">
      <div className="h-8 w-40 animate-pulse rounded bg-zinc-200" />
      <div className="mt-2 h-4 w-72 animate-pulse rounded bg-zinc-200" />
      <div className="mt-6 space-y-px overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-12 animate-pulse bg-zinc-50" />
        ))}
      </div>
    </section>
  );
}
