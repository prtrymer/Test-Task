'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ChevronRight, Folder as FolderIcon, HardDrive } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { isApiError } from '@/lib/api/errors';
import { dataRooms, files, folders } from '@/lib/api/resources';
import type { DirectoryEntry } from '@/lib/api/types';

interface Props {
  dataRoomId: string;
  roomName: string;
  entry: DirectoryEntry | null;
  onClose: () => void;
  onMoved: () => void;
}

/**
 * A folder picker that browses the tree one level at a time.
 *
 * Moving a folder into its own subtree is rejected by the domain, but the
 * destination is also filtered here so the invalid choice is never offered —
 * an error you cannot click is better than one you can.
 */
export function MoveDialog({ dataRoomId, roomName, entry, onClose, onMoved }: Props) {
  const [destination, setDestination] = useState<string | null>(null);
  const [trail, setTrail] = useState<{ id: string; name: string }[]>([]);
  const [openedFor, setOpenedFor] = useState<string | null>(null);

  // Reset the picker when a different item is being moved. Done during render
  // rather than in an effect so the dialog never shows the previous target's
  // browsing position.
  if (entry && entry.id !== openedFor) {
    setOpenedFor(entry.id);
    setDestination(null);
    setTrail([]);
  }

  const listing = useQuery({
    queryKey: ['move-picker', dataRoomId, destination],
    queryFn: () => dataRooms.entries(dataRoomId, { folderId: destination }),
    enabled: Boolean(entry),
  });

  const move = useMutation({
    mutationFn: async () => {
      if (!entry) throw new Error('Nothing selected');
      if (entry.kind === 'folder') {
        await folders.move(dataRoomId, entry.id, destination);
      } else {
        await files.move(dataRoomId, entry.id, destination);
      }
    },
    onSuccess: () => {
      toast.success(`Moved “${entry?.name}”`);
      onMoved();
      onClose();
    },
    onError: (error) =>
      toast.error(isApiError(error) ? error.message : 'Could not move that'),
  });

  const candidates = (listing.data?.items ?? []).filter(
    (item): item is Extract<DirectoryEntry, { kind: 'folder' }> =>
      // Its own subtree is not a legal destination, and neither is itself.
      item.kind === 'folder' && item.id !== entry?.id,
  );

  return (
    <Dialog open={Boolean(entry)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">Move “{entry?.name}”</DialogTitle>
          <DialogDescription>Choose a destination folder.</DialogDescription>
        </DialogHeader>

        <nav
          aria-label="Destination"
          className="flex flex-wrap items-center gap-1 text-sm"
        >
          <button
            type="button"
            onClick={() => {
              setDestination(null);
              setTrail([]);
            }}
            className="flex items-center gap-1.5 rounded px-1 text-muted-foreground hover:text-foreground"
          >
            <HardDrive className="size-3.5" aria-hidden />
            {roomName}
          </button>
          {trail.map((crumb, index) => (
            <span key={crumb.id} className="flex items-center gap-1">
              <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />
              <button
                type="button"
                onClick={() => {
                  setDestination(crumb.id);
                  setTrail(trail.slice(0, index + 1));
                }}
                className="rounded px-1 text-muted-foreground hover:text-foreground"
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </nav>

        <div className="h-56 overflow-y-auto rounded-md border">
          {listing.isPending ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : candidates.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No subfolders here. It will be moved into this location.
            </p>
          ) : (
            <ul className="divide-y">
              {candidates.map((folder) => (
                <li key={folder.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setDestination(folder.id);
                      setTrail([...trail, { id: folder.id, name: folder.name }]);
                    }}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <FolderIcon
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <span className="truncate">{folder.name}</span>
                    </span>
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {/* Moving somewhere it already sits is refused by the server, which
              surfaces as a toast — the listing rows do not carry a parent id,
              so the client cannot reliably pre-empt it. */}
          <Button onClick={() => move.mutate()} disabled={move.isPending}>
            {move.isPending ? 'Moving…' : 'Move here'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
