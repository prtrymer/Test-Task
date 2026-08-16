'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Sidebar } from '@/components/app-shell/sidebar';
import { TopBar, TopBarSkeleton } from '@/components/app-shell/top-bar';
import { useSession } from '@/features/auth/use-session';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, ready, isSignedIn, signOut } = useSession();

  useEffect(() => {
    if (ready && !isSignedIn) router.replace('/login');
  }, [ready, isSignedIn, router]);

  if (!ready || !isSignedIn) {
    return (
      <div className="flex h-screen flex-col">
        <TopBarSkeleton />
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar user={user} onSignOut={signOut} />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
