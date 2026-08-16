'use client';

import type { ReactNode } from 'react';
import {
  Download,
  FolderInput,
  MoreVertical,
  Pencil,
  Share2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DirectoryEntry } from '@/lib/api/types';

export interface EntryHandlers {
  onOpen: (entry: DirectoryEntry) => void;
  onRename: (entry: DirectoryEntry) => void;
  onMove: (entry: DirectoryEntry) => void;
  onShare: (entry: DirectoryEntry) => void;
  onDelete: (entry: DirectoryEntry) => void;
}

/** The action list, shared by the right-click menu and the row's ⋮ button. */
function items(entry: DirectoryEntry, handlers: EntryHandlers) {
  return [
    entry.kind === 'file'
      ? { icon: Download, label: 'Open', run: () => handlers.onOpen(entry) }
      : { icon: FolderInput, label: 'Open', run: () => handlers.onOpen(entry) },
    { icon: Share2, label: 'Share', run: () => handlers.onShare(entry) },
    { icon: Pencil, label: 'Rename', run: () => handlers.onRename(entry) },
    { icon: FolderInput, label: 'Move to…', run: () => handlers.onMove(entry) },
  ];
}

/**
 * Right-clicking a row opens the same actions, as Drive does.
 *
 * `render` receives the element the trigger should *become* — a `<li>` here —
 * rather than wrapping one. Wrapping would put a `<div>` between `<ul>` and its
 * items, which is invalid HTML and takes the rows out of the grid's flow.
 */
export function EntryContextMenu({
  entry,
  handlers,
  render,
  children,
}: {
  entry: DirectoryEntry;
  handlers: EntryHandlers;
  render: React.ReactElement;
  children: ReactNode;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger render={render}>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {items(entry, handlers).map((item) => (
          <ContextMenuItem key={item.label} onClick={item.run}>
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </ContextMenuItem>
        ))}
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onClick={() => handlers.onDelete(entry)}>
          <Trash2 className="size-4" aria-hidden />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function EntryOverflowMenu({
  entry,
  handlers,
}: {
  entry: DirectoryEntry;
  handlers: EntryHandlers;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`Actions for ${entry.name}`}
          />
        }
      >
        <MoreVertical className="size-4" aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        {items(entry, handlers)
          .slice(1)
          .map((item) => (
            <DropdownMenuItem key={item.label} onClick={item.run}>
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </DropdownMenuItem>
          ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => handlers.onDelete(entry)}>
          <Trash2 className="size-4" aria-hidden />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
