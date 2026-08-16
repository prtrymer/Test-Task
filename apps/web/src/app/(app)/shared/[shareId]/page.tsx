'use client';

import { useQuery } from '@tanstack/react-query';
import { use } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Browser } from '@/features/browser/browser';
import { FileViewer } from '@/features/files/file-viewer';
import { shares } from '@/lib/api/resources';
import { keys } from '@/lib/query/keys';
import { Inbox } from 'lucide-react';

/**
 * A recipient's view of one grant. The browser is rooted at whatever was
 * shared, so navigating "up" stops there rather than exposing the ancestors
 * the grant does not cover.
 */
export default function SharedItemPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = use(params);

  const list = useQuery({ queryKey: keys.sharedWithMe, queryFn: shares.sharedWithMe });

  if (list.isPending) return <Skeleton className="h-24 w-full" />;
  if (list.isError) return <ErrorState error={list.error} onRetry={() => list.refetch()} />;

  const grant = list.data.items.find((item) => item.shareId === shareId);

  // The grant vanished between the list and this page — revoked, or the item
  // was deleted. Same message either way, because the API does not distinguish.
  if (!grant) {
    return (
      <EmptyState
        icon={Inbox}
        title="This is no longer available"
        description="It may have been deleted, or the owner may have revoked your access."
      />
    );
  }

  if (grant.subjectType === 'FILE') {
    return (
      <SharedFile
        dataRoomId={grant.dataRoomId}
        fileId={grant.subjectFileId as string}
        roomName={grant.dataRoomName}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{grant.dataRoomName}</h1>
          <p className="text-sm text-muted-foreground">Shared by {grant.ownerEmail}</p>
        </div>
        <Badge variant="secondary">Read-only</Badge>
      </div>

      <Browser
        dataRoomId={grant.dataRoomId}
        roomName={grant.dataRoomName}
        readOnly
        rootFolderId={grant.subjectFolderId}
        rootLabel={grant.subjectType === 'FOLDER' ? 'Shared folder' : grant.dataRoomName}
      />
    </div>
  );
}

function SharedFile({
  dataRoomId,
  fileId,
  roomName,
}: {
  dataRoomId: string;
  fileId: string;
  roomName: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{roomName}</h1>
        <Badge variant="secondary">Read-only</Badge>
      </div>
      <FileViewer dataRoomId={dataRoomId} fileId={fileId} onClose={() => undefined} />
    </div>
  );
}
