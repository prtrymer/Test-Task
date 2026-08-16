'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LogOut, Vault } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/use-session';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, ready, isSignedIn, signOut } = useSession();

  useEffect(() => {
    if (ready && !isSignedIn) router.replace('/login');
  }, [ready, isSignedIn, router]);

  if (!ready || !isSignedIn) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/rooms" className="flex items-center gap-2 font-medium">
            <Vault className="size-4" aria-hidden />
            Data Room
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/shared"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Shared with me
            </Link>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                signOut();
                router.replace('/login');
              }}
            >
              <LogOut className="size-4" aria-hidden />
              <span className="sr-only">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
