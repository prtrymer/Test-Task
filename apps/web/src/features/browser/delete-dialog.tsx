'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { isApiError } from '@/lib/api/errors';
import { files, folders } from '@/lib/api/resources';
import { describeContents, formatBytes } from '@/lib/format';
import type { DirectoryEntry } from '@/lib/api/types';

interface Props {
  dataRoomId: string;
  entry: DirectoryEntry | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteDialog({ dataRoomId, entry, onClose, onDeleted }: Props) {
  const isFolder = entry?.kind === 'folder';

  // Deleting a folder cascades, so the user is told what goes with it before
  // confirming rather than after.
  const preview = useQuery({
    queryKey: ['deletion-preview', dataRoomId, entry?.id],
    queryFn: () => folders.deletionPreview(dataRoomId, entry!.id),
    enabled: Boolean(entry && isFolder),
    staleTime: 0,
  });

  const remove = useMutation({
    mutationFn: () => {
      if (!entry) throw new Error('Nothing selected');
      return entry.kind === 'folder'
        ? folders.remove(dataRoomId, entry.id).then(() => undefined)
        : files.remove(dataRoomId, entry.id);
    },
    onSuccess: () => {
      toast.success(`Deleted “${entry?.name}”`);
      onDeleted();
      onClose();
    },
    onError: (error) =>
      toast.error(isApiError(error) ? error.message : 'Could not delete that'),
  });

  const stats = preview.data;
  const isEmptyFolder = stats && stats.folderCount === 0 && stats.fileCount === 0;

  return (
    <AlertDialog open={Boolean(entry)} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          {/* Filenames have no spaces to break on, so a long one would push the
              dialog past its max-width and drag the footer out with it.
              Wrapping rather than truncating: you have to be able to read what
              you are about to destroy. */}
          <AlertDialogTitle className="[overflow-wrap:anywhere]">
            Delete “{entry?.name}”?
          </AlertDialogTitle>
          <AlertDialogDescription render={<div />}>
            <div className="space-y-3">
              {!isFolder && <p>This file and all of its versions will be deleted.</p>}

              {isFolder && preview.isPending && <Skeleton className="h-5 w-56" />}

              {isFolder && preview.isError && (
                <p>
                  This folder and everything inside it will be deleted. (Couldn&apos;t
                  load the exact contents.)
                </p>
              )}

              {isFolder && stats && (
                <p>
                  {isEmptyFolder ? (
                    <>This folder is empty.</>
                  ) : (
                    <>
                      This will also delete{' '}
                      <strong className="text-foreground">
                        {describeContents(stats.folderCount, stats.fileCount)}
                      </strong>{' '}
                      inside it, totalling{' '}
                      <strong className="text-foreground">
                        {formatBytes(stats.totalSizeBytes)}
                      </strong>
                      .
                    </>
                  )}
                </p>
              )}

              <p className="text-destructive">This cannot be undone.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              // Keep the dialog open while the request is in flight.
              event.preventDefault();
              remove.mutate();
            }}
            disabled={remove.isPending}
          >
            {remove.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
