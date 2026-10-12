'use client';

import { useEffect } from 'react';

/** Shown when a page fails to load data, most often because the API is not reachable. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-6 py-8">
      <h1 className="font-semibold text-red-900">Couldn&apos;t load analytics data</h1>
      <p className="mt-1 text-sm text-red-800">
        Check that the API is running and <code className="font-mono">NEXT_PUBLIC_API_URL</code> points to it.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  );
}
