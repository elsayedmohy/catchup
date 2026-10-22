'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions';
import { ThemeToggle } from './theme-toggle';

const links = [
  { href: '/inbox', label: 'Inbox' },
  { href: '/archive', label: 'Archive' },
  { href: '/settings', label: 'Settings' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <Link href="/inbox" className="brand">
        <span className="brand-mark" aria-hidden="true">
          C
        </span>
        Catchup
      </Link>

      <nav className="nav" aria-label="Main">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="nav-link"
            aria-current={pathname === link.href ? 'page' : undefined}
          >
            {link.label}
          </Link>
        ))}

        <ThemeToggle />

        <form action={logoutAction}>
          <button type="submit" className="button button-ghost">
            Sign out
          </button>
        </form>
      </nav>
    </header>
  );
}
