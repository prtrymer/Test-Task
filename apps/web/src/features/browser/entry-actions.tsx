'use client';

import { MoreHorizontal, Pencil, Share2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DirectoryEntry } from '@/lib/api/types';

interface Props {
  entry: DirectoryEntry;
  onRename: (entry: DirectoryEntry) => void;
  onDelete: (entry: DirectoryEntry) => void;
  onShare: (entry: DirectoryEntry) => void;
}

export function EntryActions({ entry, onRename, onDelete, onShare }: Props) {
  return (
    <DropdownMenu>
      {/* Base UI takes a `render` element rather than Radix's `asChild`. */}
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={`Actions for ${entry.name}`} />
        }
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onRename(entry)}>
          <Pencil className="size-4" aria-hidden />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onShare(entry)}>
          <Share2 className="size-4" aria-hidden />
          Share
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(entry)}>
          <Trash2 className="size-4" aria-hidden />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
