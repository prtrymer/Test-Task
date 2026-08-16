'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/features/auth/use-session';

export default function RootPage() {
  const router = useRouter();
  const { isSignedIn, ready } = useSession();

  useEffect(() => {
    if (!ready) return;
    router.replace(isSignedIn ? '/rooms' : '/login');
  }, [ready, isSignedIn, router]);

  return null;
}
