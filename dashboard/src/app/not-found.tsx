import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
      <h1 className="font-semibold">Not found</h1>
      <p className="mt-1 text-sm text-zinc-600">That session or page doesn&apos;t exist (yet).</p>
      <Link href="/sessions" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">
        ← Back to sessions
      </Link>
    </div>
  );
}
