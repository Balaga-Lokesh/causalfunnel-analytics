'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

/** Re-fetches the current server-rendered page without a full reload. */
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-xs hover:bg-zinc-50 disabled:opacity-60"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className={`size-4 ${pending ? 'animate-spin' : ''}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <path d="M16.5 10a6.5 6.5 0 1 1-1.9-4.6M16.5 3.5v3.2h-3.2" />
      </svg>
      {pending ? 'Refreshing…' : 'Refresh'}
    </button>
  );
}
