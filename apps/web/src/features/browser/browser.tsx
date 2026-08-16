'use client';

import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
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
import { DropTarget } from '@/features/upload/drop-target';
import { UploadPanel } from '@/features/upload/upload-panel';
import { useUploads } from '@/features/upload/use-uploads';
import { BreadcrumbBar } from './breadcrumb-bar';
import { BrowserToolbar, type SortMode, type ViewMode } from './browser-toolbar';
import { CreateFolderDialog } from './create-folder-dialog';
import { DeleteDialog } from './delete-dialog';
import { EntryGrid, EntryList } from './entry-list';
import { MoveDialog } from './move-dialog';
import { RenameDialog } from './rename-dialog';
import type { EntryHandlers } from './entry-menu';
import { useBreadcrumbs, useDirectory, useRefreshRoom } from './use-directory';

interface Props {
  dataRoomId: string;
  roomName: string;
  readOnly?: boolean;
  shareToken?: string | null;
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
  const [view, setView] = useState<ViewMode>('list');
  const [sort, setSort] = useState<SortMode>('name');
  const debouncedTerm = useDebounced(term, 300);

  const [renaming, setRenaming] = useState<DirectoryEntry | null>(null);
  const [deleting, setDeleting] = useState<DirectoryEntry | null>(null);
  const [moving, setMoving] = useState<DirectoryEntry | null>(null);
  const [sharing, setSharing] = useState<ShareTarget | null>(null);
  const [viewing, setViewing] = useState<DirectoryEntry | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const filePicker = useRef<HTMLInputElement>(null);
  const scope = { dataRoomId, folderId, shareToken };
  const refresh = useRefreshRoom(dataRoomId);

  const directory = useDirectory(scope, sort);
  const breadcrumbs = useBreadcrumbs(scope);
  const uploads = useUploads({ dataRoomId, folderId, onCommitted: refresh });

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

  const handlers: EntryHandlers = {
    onOpen: (entry) => {
      if (entry.kind === 'folder') {
        setFolderId(entry.id);
        setTerm('');
      } else {
        setViewing(entry);
      }
    },
    onRename: setRenaming,
    onMove: setMoving,
    onDelete: setDeleting,
    onShare: (entry) =>
      setSharing({
        subjectType: entry.kind === 'folder' ? 'FOLDER' : 'FILE',
        subjectFolderId: entry.kind === 'folder' ? entry.id : null,
        subjectFileId: entry.kind === 'file' ? entry.id : null,
        label: entry.name,
      }),
  };

  const entries = searching ? (results.data?.items ?? []) : directory.entries;
  const listing = searching ? results : directory;
  const currentFolderName = breadcrumbs.data?.items.at(-1)?.name;

  return (
    <DropTarget onFiles={uploads.enqueue} disabled={readOnly} label={currentFolderName}>
      <div className="space-y-4 p-6">
        <BreadcrumbBar
          roomName={roomName}
          trail={breadcrumbs.data?.items ?? []}
          onNavigate={(id) => {
            setFolderId(id ?? rootFolderId);
            setTerm('');
          }}
          rootLabel={rootLabel}
        />

        <div className="relative max-w-md">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search file names…"
            className="rounded-full bg-muted/50 pl-9"
            aria-label="Search file names"
          />
        </div>

        <BrowserToolbar
          view={view}
          onViewChange={setView}
          sort={sort}
          onSortChange={setSort}
          onNewFolder={() => setCreatingFolder(true)}
          onPickFiles={() => filePicker.current?.click()}
          readOnly={readOnly}
        />

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
                  : 'Drop PDFs anywhere on this page, or use the New button.'
            }
          />
        ) : (
          <>
            {view === 'list' ? (
              <EntryList entries={entries} handlers={handlers} interactive={!readOnly} />
            ) : (
              <EntryGrid entries={entries} handlers={handlers} interactive={!readOnly} />
            )}

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
      </div>

      {!readOnly && (
        <input
          ref={filePicker}
          type="file"
          accept="application/pdf"
          multiple
          className="sr-only"
          onChange={(event) => {
            const selected = Array.from(event.target.files ?? []);
            if (selected.length) uploads.enqueue(selected);
            // Reset so re-picking the same file fires change again.
            event.target.value = '';
          }}
        />
      )}

      <CreateFolderDialog
        dataRoomId={dataRoomId}
        parentId={folderId}
        open={creatingFolder}
        onOpenChange={setCreatingFolder}
        onCreated={refresh}
      />
      <RenameDialog
        dataRoomId={dataRoomId}
        entry={renaming}
        onClose={() => setRenaming(null)}
        onRenamed={refresh}
      />
      <MoveDialog
        dataRoomId={dataRoomId}
        roomName={roomName}
        entry={moving}
        onClose={() => setMoving(null)}
        onMoved={refresh}
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

      <UploadPanel
        items={uploads.items}
        onDismiss={uploads.dismiss}
        onClearFinished={uploads.clearFinished}
      />
    </DropTarget>
  );
}
