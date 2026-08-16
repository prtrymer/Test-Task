'use client';

import type { ReactNode } from 'react';
import { FileText, Folder as FolderIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatBytes, formatDate } from '@/lib/format';
import type { DirectoryEntry } from '@/lib/api/types';
import { EntryContextMenu, EntryOverflowMenu, type EntryHandlers } from './entry-menu';

interface Props {
  entries: DirectoryEntry[];
  handlers: EntryHandlers;

  interactive?: boolean;
}

const ROW_GRID = 'grid grid-cols-[1fr_7rem_9rem_3rem] items-center gap-3';

function EntryIcon({ entry }: { entry: DirectoryEntry }) {
  return entry.kind === 'folder' ? (
    <FolderIcon
      className="size-5 shrink-0 fill-muted-foreground/20 text-muted-foreground"
      aria-hidden
    />
  ) : (
    <FileText className="size-5 shrink-0 text-primary" aria-hidden />
  );
}

function Item({
  entry,
  handlers,
  interactive,
  className,
  children,
}: {
  entry: DirectoryEntry;
  handlers: EntryHandlers;
  interactive: boolean;
  className: string;
  children: ReactNode;
}) {
  if (!interactive) return <li className={className}>{children}</li>;

  return (
    <EntryContextMenu
      entry={entry}
      handlers={handlers}
      render={<li className={className} />}
    >
      {children}
    </EntryContextMenu>
  );
}

export function EntryList({ entries, handlers, interactive = true }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div
        className={`${ROW_GRID} border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground`}
      >
        <span>Name</span>
        <span>Size</span>
        <span>Modified</span>
        <span className="sr-only">Actions</span>
      </div>

      <ul className="divide-y">
        {entries.map((entry) => (
          <Item
            key={`${entry.kind}-${entry.id}`}
            entry={entry}
            handlers={handlers}
            interactive={interactive}
            className={`group ${ROW_GRID} px-4 transition-colors hover:bg-accent/50`}
          >
            <button
              type="button"
              onClick={() => handlers.onOpen(entry)}
              className="flex min-w-0 items-center gap-3 py-2.5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <EntryIcon entry={entry} />
              <span className="truncate text-sm">{entry.name}</span>
              {entry.kind === 'file' && entry.versionNumber > 1 && (
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  v{entry.versionNumber}
                </Badge>
              )}
            </button>

            <span className="text-sm text-muted-foreground">
              {entry.kind === 'file' ? formatBytes(entry.sizeBytes) : '—'}
            </span>

            <span className="text-sm text-muted-foreground">
              {formatDate(entry.updatedAt)}
            </span>

            <span className="flex justify-end">
              {interactive && (
                <span className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <EntryOverflowMenu entry={entry} handlers={handlers} />
                </span>
              )}
            </span>
          </Item>
        ))}
      </ul>
    </div>
  );
}

export function EntryGrid({ entries, handlers, interactive = true }: Props) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
      {entries.map((entry) => (
        <Item
          key={`${entry.kind}-${entry.id}`}
          entry={entry}
          handlers={handlers}
          interactive={interactive}
          className="group relative"
        >
          <button
            type="button"
            onClick={() => handlers.onOpen(entry)}
            className="flex w-full flex-col gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span className="flex h-20 items-center justify-center rounded-md bg-muted/50">
              <EntryIcon entry={entry} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{entry.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {entry.kind === 'file'
                  ? `${formatBytes(entry.sizeBytes)} · ${formatDate(entry.updatedAt)}`
                  : formatDate(entry.updatedAt)}
              </span>
            </span>
          </button>

          {interactive && (
            <span className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <EntryOverflowMenu entry={entry} handlers={handlers} />
            </span>
          )}
        </Item>
      ))}
    </ul>
  );
}
