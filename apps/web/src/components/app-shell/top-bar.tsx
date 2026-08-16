'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Vault } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { User } from '@/lib/api/types';

export function TopBar({
  user,
  onSignOut,
}: {
  user: User | null;
  onSignOut: () => void;
}) {
  const router = useRouter();
  const initials = (user?.name ?? user?.email ?? '?').trim().charAt(0).toUpperCase();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4">
      <Link href="/rooms" className="flex items-center gap-2 font-medium">
        <Vault className="size-5 text-primary" aria-hidden />
        <span>Data Room</span>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button type="button" aria-label="Account menu" className="rounded-full" />
          }
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary text-xs text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal">
              <span className="block truncate text-sm font-medium">
                {user?.name ?? 'Signed in'}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {user?.email}
              </span>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => {
                onSignOut();
                router.replace('/login');
              }}
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

export function TopBarSkeleton() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <Vault className="size-5 text-primary" aria-hidden />
      <span className="font-medium">Data Room</span>
    </header>
  );
}
