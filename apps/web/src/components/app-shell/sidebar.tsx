'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HardDrive, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: '/rooms', label: 'My data rooms', icon: HardDrive },
  { href: '/shared', label: 'Shared with me', icon: Users },
];

/**
 * Drive's left rail: the primary create action sits above navigation rather
 * than in the content area, so it stays reachable at any depth of the tree.
 */
export function Sidebar({ createSlot }: { createSlot?: ReactNode }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-4 border-r bg-sidebar px-3 py-4 md:flex">
      {createSlot && <div className="px-1">{createSlot}</div>}

      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-full px-4 py-2 text-sm transition-colors ${
                active
                  ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/60'
              }`}
            >
              <item.icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
