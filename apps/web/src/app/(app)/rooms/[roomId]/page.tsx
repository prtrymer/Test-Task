'use client';

import { useQuery } from '@tanstack/react-query';
import { use, useState } from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state';
import { Browser } from '@/features/browser/browser';
import { ShareDialog, type ShareTarget } from '@/features/sharing/share-dialog';
import { dataRooms } from '@/lib/api/resources';
import { keys } from '@/lib/query/keys';

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const [sharingRoom, setSharingRoom] = useState<ShareTarget | null>(null);

  const room = useQuery({
    queryKey: keys.dataRoom(roomId),
    queryFn: () => dataRooms.get(roomId),
  });

  if (room.isPending) return <Skeleton className="h-9 w-64" />;
  if (room.isError) return <ErrorState error={room.error} onRetry={() => room.refetch()} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{room.data.name}</h1>
        <Button
          variant="outline"
          onClick={() =>
            setSharingRoom({ subjectType: 'DATA_ROOM', label: room.data.name })
          }
        >
          <Share2 className="size-4" aria-hidden />
          Share data room
        </Button>
      </div>

      <Browser dataRoomId={roomId} roomName={room.data.name} />

      <ShareDialog
        dataRoomId={roomId}
        target={sharingRoom}
        onClose={() => setSharingRoom(null)}
      />
    </div>
  );
}
