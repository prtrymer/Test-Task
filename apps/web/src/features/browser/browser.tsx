'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FolderOpen, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { dataRooms } from '@/lib/api/resources';
import { keys } from '@/lib/query/keys';
import { useDebounced } from '@/lib/use-debounced';
import type { DirectoryEntry } from '@/lib/api/types';
import { FileViewer } from '@/features/files/file-viewer';
import { ShareDialog, type ShareTarget } from '@/features/sharing/share-dialog';
import { UploadZone } from '@/features/upload/upload-zone';
import { useUploads } from '@/features/upload/use-uploads';
import { BreadcrumbBar } from './breadcrumb-bar';
import { CreateFolderDialog } from './create-folder-dialog';
import { DeleteDialog } from './delete-dialog';
import { EntryActions } from './entry-actions';
import { EntryTable } from './entry-table';
import { RenameDialog } from './rename-dialog';
import { useBreadcrumbs, useDirectory, useRefreshRoom } from './use-directory';

interface Props {
  dataRoomId: string;
  roomName: string;
  /** Read-only mode for share recipients: no upload, no mutations. */
  readOnly?: boolean;
  shareToken?: string | null;
  /** Where "up" stops for a recipient browsing a shared folder. */
  rootFolderId?: string | null;
  rootLabel?: string;
}

export function Browser({
  dataRoomId,
  roomName,
  readOnly = false,
  shareToken = null,
  rootFolderId = null,
  rootLabel,
}: Props) {
  const [folderId, setFolderId] = useState<string | null>(rootFolderId);
  const [term, setTerm] = useState('');
  const debouncedTerm = useDebounced(term, 300);

  const [renaming, setRenaming] = useState<DirectoryEntry | null>(null);
  const [deleting, setDeleting] = useState<DirectoryEntry | null>(null);
  const [sharing, setSharing] = useState<ShareTarget | null>(null);
  const [viewing, setViewing] = useState<DirectoryEntry | null>(null);

  const scope = { dataRoomId, folderId, shareToken };
  const refresh = useRefreshRoom(dataRoomId);

  const directory = useDirectory(scope);
  const breadcrumbs = useBreadcrumbs(scope);

  const searching = debouncedTerm.trim().length > 0;
  const results = useQuery({
    queryKey: keys.search(dataRoomId, debouncedTerm, rootFolderId),
    queryFn: () =>
      dataRooms.search(
        dataRoomId,
        { q: debouncedTerm, folderId: rootFolderId },
        { shareToken },
      ),
    enabled: searching,
  });

  const uploads = useUploads({ dataRoomId, folderId, onCommitted: refresh });

  function openEntry(entry: DirectoryEntry) {
    if (entry.kind === 'folder') {
      setFolderId(entry.id);
      setTerm('');
    } else {
      setViewing(entry);
    }
  }

  const entries = searching ? (results.data?.items ?? []) : directory.entries;
  const listing = searching ? results : directory;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BreadcrumbBar
          roomName={roomName}
          trail={breadcrumbs.data?.items ?? []}
          onNavigate={(id) => {
            setFolderId(id ?? rootFolderId);
            setTerm('');
          }}
          rootLabel={rootLabel}
          rootNavigable
        />

        {!readOnly && (
          <div className="flex items-center gap-2">
            <CreateFolderDialog
              dataRoomId={dataRoomId}
              parentId={folderId}
              onCreated={refresh}
            />
          </div>
        )}
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search file names…"
          className="pl-9"
          aria-label="Search file names"
        />
      </div>

      {!readOnly && (
        <UploadZone
          items={uploads.items}
          onFiles={uploads.enqueue}
          onClearFinished={uploads.clearFinished}
          onDismiss={uploads.dismiss}
        />
      )}

      {listing.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : listing.isError ? (
        <ErrorState error={listing.error} onRetry={() => listing.refetch()} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={searching ? Search : FolderOpen}
          title={searching ? 'No files match that name' : 'This folder is empty'}
          description={
            searching
              ? 'Try a different search term.'
              : readOnly
                ? 'Nothing has been shared here yet.'
                : 'Create a folder or drop some PDFs above to get started.'
          }
        />
      ) : (
        <>
          <EntryTable
            entries={entries}
            onOpen={openEntry}
            renderActions={
              readOnly
                ? undefined
                : (entry) => (
                    <EntryActions
                      entry={entry}
                      onRename={setRenaming}
                      onDelete={setDeleting}
                      onShare={() =>
                        setSharing({
                          subjectType: entry.kind === 'folder' ? 'FOLDER' : 'FILE',
                          subjectFolderId: entry.kind === 'folder' ? entry.id : null,
                          subjectFileId: entry.kind === 'file' ? entry.id : null,
                          label: entry.name,
                        })
                      }
                    />
                  )
            }
          />

          {!searching && directory.hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => directory.fetchNextPage()}
                disabled={directory.isFetchingNextPage}
              >
                {directory.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </>
      )}

      <RenameDialog
        dataRoomId={dataRoomId}
        entry={renaming}
        onClose={() => setRenaming(null)}
        onRenamed={refresh}
      />
      <DeleteDialog
        dataRoomId={dataRoomId}
        entry={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={refresh}
      />
      <ShareDialog
        dataRoomId={dataRoomId}
        target={sharing}
        onClose={() => setSharing(null)}
      />
      <FileViewer
        dataRoomId={dataRoomId}
        fileId={viewing?.id ?? null}
        fileName={viewing?.name}
        shareToken={shareToken}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}
