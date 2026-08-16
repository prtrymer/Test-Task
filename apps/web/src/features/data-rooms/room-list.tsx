'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { dataRooms } from '@/lib/api/resources';
import { isApiError } from '@/lib/api/errors';
import { keys } from '@/lib/query/keys';
import { formatDate } from '@/lib/format';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';

export function RoomList() {
  const rooms = useQuery({ queryKey: keys.dataRooms, queryFn: dataRooms.list });

  if (rooms.isPending) {
    return (
      <div className="space-y-3 p-6">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (rooms.isError) {
    return (
      <div className="p-6">
        <ErrorState error={rooms.error} onRetry={() => rooms.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Data rooms</h1>
          <p className="text-sm text-muted-foreground">
            {rooms.data.items.length === 0
              ? 'No data rooms yet'
              : `${rooms.data.items.length} room${rooms.data.items.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <CreateRoomDialog />
      </div>

      {rooms.data.items.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Create your first data room"
          description="A data room is the top-level container for the documents you'll share."
        />
      ) : (
        <ul className="divide-y rounded-lg border">
          {rooms.data.items.map((room) => (
            <li key={room.id}>
              <Link
                href={`/rooms/${room.id}`}
                className="flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/50"
              >
                <span className="flex items-center gap-3">
                  <FolderOpen className="size-4 text-muted-foreground" aria-hidden />
                  <span className="font-medium">{room.name}</span>
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatDate(room.createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CreateRoomDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const create = useMutation({
    mutationFn: () => dataRooms.create(name.trim()),
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: keys.dataRooms });
      setOpen(false);
      setName('');
      toast.success(`Created “${room.name}”`);
    },
    onError: (error) =>
      toast.error(isApiError(error) ? error.message : 'Could not create the data room'),
  });

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        New data room
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setName('');
        }}
      >
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) create.mutate();
            }}
          >
            <DialogHeader>
              <DialogTitle>New data room</DialogTitle>
              <DialogDescription>
                Give it a name you&apos;ll recognise — you can rename it later.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-4">
              <Label htmlFor="room-name">Name</Label>
              <Input
                id="room-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project Atlas"
                autoFocus
                maxLength={255}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || create.isPending}>
                {create.isPending ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
