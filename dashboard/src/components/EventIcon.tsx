import type { EventType } from '@/lib/types';

/** Small icon for an event type: a page for page_view, a cursor for click. */
export function EventIcon({ type, className = 'size-4' }: { type: EventType; className?: string }) {
  if (type === 'page_view') {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M5 2.75h6.5L15.25 6.5v10.75H5z" strokeLinejoin="round" />
        <path d="M11.25 2.75V6.75h4" strokeLinejoin="round" />
        <path d="M7.5 10.5h5M7.5 13.5h5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 3.5l10 5.25-4.25 1.25L9.25 14.5z" strokeLinejoin="round" />
      <path d="M10.75 10l3.5 3.75" strokeLinecap="round" />
    </svg>
  );
}
