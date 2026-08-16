'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { shares } from '@/lib/api/resources';
import { keys } from '@/lib/query/keys';

const SUBJECT_LABEL = {
  DATA_ROOM: 'Whole data room',
  FOLDER: 'A folder',
  FILE: 'A single file',
} as const;

export default function SharedWithMePage() {
  const list = useQuery({ queryKey: keys.sharedWithMe, queryFn: shares.sharedWithMe });

  if (list.isPending) return <Skeleton className="h-24 w-full" />;
  if (list.isError) return <ErrorState error={list.error} onRetry={() => list.refetch()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Shared with me</h1>
        <p className="text-sm text-muted-foreground">Read-only access granted by others</p>
      </div>

      {list.data.items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Nothing shared with you yet"
          description="When someone grants you access, it appears here."
        />
      ) : (
        <ul className="divide-y rounded-lg border">
          {list.data.items.map((item) => (
            <li key={item.shareId}>
              <Link
                href={`/shared/${item.shareId}`}
                className="flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/50"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.dataRoomName}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    from {item.ownerEmail}
                  </span>
                </span>
                <Badge variant="secondary" className="shrink-0">
                  {SUBJECT_LABEL[item.subjectType]}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
