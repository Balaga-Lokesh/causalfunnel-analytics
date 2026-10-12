'use client';

import { useEffect, useState } from 'react';
import { formatRelative } from '@/lib/format';

type Mode = 'datetime' | 'time' | 'relative';

const formatters: Record<Exclude<Mode, 'relative'>, Intl.DateTimeFormatOptions> = {
  datetime: { dateStyle: 'medium', timeStyle: 'medium' },
  time: { hour: '2-digit', minute: '2-digit', second: '2-digit' },
};

function format(iso: string, mode: Mode, timeZone?: string) {
  if (mode === 'relative') return formatRelative(iso);
  return new Intl.DateTimeFormat('en', { ...formatters[mode], timeZone }).format(new Date(iso));
}

/**
 * Renders a timestamp in the viewer's local time zone.
 * The server renders UTC first; the client swaps in local time after hydration
 * so server and client markup always match.
 */
export function LocalTime({ iso, mode = 'datetime' }: { iso: string; mode?: Mode }) {
  const [text, setText] = useState(() => format(iso, mode === 'relative' ? 'datetime' : mode, 'UTC'));

  useEffect(() => {
    setText(format(iso, mode));
    if (mode !== 'relative') return;
    const timer = setInterval(() => setText(format(iso, mode)), 30_000);
    return () => clearInterval(timer);
  }, [iso, mode]);

  return (
    <time dateTime={iso} title={new Date(iso).toISOString()}>
      {text}
    </time>
  );
}
