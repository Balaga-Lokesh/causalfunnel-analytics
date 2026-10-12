'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/sessions', label: 'Sessions' },
  { href: '/heatmap', label: 'Heatmap' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-8 px-4 py-4 sm:px-6">
        <Link href="/" className="font-semibold">
          Analytics
        </Link>
        <nav className="flex gap-4 text-sm">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? 'font-medium text-indigo-600' : 'text-zinc-600 hover:text-zinc-900'}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
