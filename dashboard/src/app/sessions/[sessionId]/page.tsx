import Link from 'next/link';

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return (
    <section>
      <Link href="/sessions" className="text-sm text-indigo-600 hover:underline">
        ← All sessions
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">User journey</h1>
      <p className="mt-1 font-mono text-sm text-zinc-600">{decodeURIComponent(sessionId)}</p>

      {/* TODO: fetch getSessionEvents(sessionId) and render an ordered timeline */}
    </section>
  );
}
