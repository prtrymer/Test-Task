'use client';

import { File as FileIcon, Folder as FolderIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatBytes, formatDate } from '@/lib/format';
import type { DirectoryEntry } from '@/lib/api/types';

interface Props {
  entries: DirectoryEntry[];
  onOpen: (entry: DirectoryEntry) => void;
  /** Rendered in the trailing cell; omitted entirely for read-only viewers. */
  renderActions?: (entry: DirectoryEntry) => ReactNode;
}

export function EntryTable({ entries, onOpen, renderActions }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="w-28">Size</TableHead>
            <TableHead className="w-32">Modified</TableHead>
            {renderActions && <TableHead className="w-12" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={`${entry.kind}-${entry.id}`} className="group">
              <TableCell>
                <button
                  type="button"
                  onClick={() => onOpen(entry)}
                  className="flex items-center gap-2.5 text-left font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {entry.kind === 'folder' ? (
                    <FolderIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  ) : (
                    <FileIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span className="truncate">{entry.name}</span>
                  {entry.kind === 'file' && entry.versionNumber > 1 && (
                    <Badge variant="secondary" className="shrink-0">
                      v{entry.versionNumber}
                    </Badge>
                  )}
                </button>
              </TableCell>

              <TableCell className="text-sm text-muted-foreground">
                {entry.kind === 'file' ? formatBytes(entry.sizeBytes) : '—'}
              </TableCell>

              <TableCell className="text-sm text-muted-foreground">
                {formatDate(entry.updatedAt)}
              </TableCell>

              {renderActions && (
                <TableCell className="text-right">{renderActions(entry)}</TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
