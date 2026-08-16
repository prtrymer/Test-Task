'use client';

import { FolderPlus, LayoutGrid, List, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type ViewMode = 'list' | 'grid';
export type SortMode = 'name' | 'updatedAt';

const SORT_LABELS: Record<SortMode, string> = {
  name: 'Sort by name',
  updatedAt: 'Last modified',
};

interface Props {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  sort: SortMode;
  onSortChange: (sort: SortMode) => void;
  onNewFolder: () => void;
  onPickFiles: () => void;
  readOnly?: boolean;
}

export function BrowserToolbar({
  view,
  onViewChange,
  sort,
  onSortChange,
  onNewFolder,
  onPickFiles,
  readOnly = false,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {!readOnly ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button className="rounded-full pr-5 pl-4 shadow-sm" />}
          >
            <Plus className="size-4" aria-hidden />
            New
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem onClick={onNewFolder}>
              <FolderPlus className="size-4" aria-hidden />
              New folder
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onPickFiles}>
              <Upload className="size-4" aria-hidden />
              Upload PDFs
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span />
      )}

      <div className="flex items-center gap-2">
        <Select value={sort} onValueChange={(value) => onSortChange(value as SortMode)}>
          <SelectTrigger size="sm" className="w-[11rem]" aria-label="Sort by">
            {/* Base UI renders the raw value unless given a formatter. */}
            <SelectValue>{(value) => SORT_LABELS[value as SortMode]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">{SORT_LABELS.name}</SelectItem>
            <SelectItem value="updatedAt">{SORT_LABELS.updatedAt}</SelectItem>
          </SelectContent>
        </Select>

        <div
          className="flex items-center rounded-md border p-0.5"
          role="group"
          aria-label="View mode"
        >
          <Button
            variant={view === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="size-8"
            aria-label="List view"
            aria-pressed={view === 'list'}
            onClick={() => onViewChange('list')}
          >
            <List className="size-4" aria-hidden />
          </Button>
          <Button
            variant={view === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="size-8"
            aria-label="Grid view"
            aria-pressed={view === 'grid'}
            onClick={() => onViewChange('grid')}
          >
            <LayoutGrid className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
