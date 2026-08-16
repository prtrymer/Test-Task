'use client';

import { useCallback, useRef, useState, type DragEvent } from 'react';
import { CheckCircle2, CloudUpload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/format';
import type { UploadItem } from './use-uploads';

interface Props {
  items: UploadItem[];
  onFiles: (files: File[]) => void;
  onClearFinished: () => void;
  onDismiss: (id: string) => void;
}

export function UploadZone({ items, onFiles, onClearFinished, onDismiss }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);
  // Drag events fire for every child element, so a plain boolean flickers.
  const depth = useRef(0);

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      depth.current = 0;
      setIsOver(false);
      const dropped = Array.from(event.dataTransfer.files);
      if (dropped.length) onFiles(dropped);
    },
    [onFiles],
  );

  const finished = items.filter((item) => item.status === 'done').length;

  return (
    <div className="space-y-3">
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          depth.current += 1;
          setIsOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          depth.current -= 1;
          if (depth.current <= 0) setIsOver(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`rounded-lg border border-dashed px-6 py-8 text-center transition-colors ${
          isOver ? 'border-primary bg-primary/5' : 'border-border'
        }`}
      >
        <CloudUpload className="mx-auto size-6 text-muted-foreground" aria-hidden />
        <p className="mt-2 text-sm font-medium">Drop PDFs here</p>
        <p className="text-xs text-muted-foreground">
          or{' '}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="underline underline-offset-4 hover:text-foreground"
          >
            browse your files
          </button>{' '}
          — up to 100 MB each
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="sr-only"
          onChange={(e) => {
            const selected = Array.from(e.target.files ?? []);
            if (selected.length) onFiles(selected);
            // Reset so re-picking the same file fires change again.
            e.target.value = '';
          }}
        />
      </div>

      {items.length > 0 && (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {items.length} file{items.length === 1 ? '' : 's'}
            </p>
            {finished > 0 && (
              <Button variant="ghost" size="sm" onClick={onClearFinished}>
                Clear completed
              </Button>
            )}
          </div>

          <ul className="space-y-2">
            {items.map((item) => (
              <UploadRow key={item.id} item={item} onDismiss={onDismiss} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function UploadRow({
  item,
  onDismiss,
}: {
  item: UploadItem;
  onDismiss: (id: string) => void;
}) {
  const failed = item.status === 'error';
  const done = item.status === 'done';

  return (
    <li className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          {done && <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" aria-hidden />}
          <span className="truncate">{item.name}</span>
          {item.versioned && (
            <span className="shrink-0 text-xs text-muted-foreground">saved as new version</span>
          )}
        </span>

        <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          {failed ? (
            <span className="text-destructive">{item.error}</span>
          ) : done ? (
            formatBytes(item.sizeBytes)
          ) : item.status === 'finalising' ? (
            'finishing…'
          ) : (
            `${item.percent}%`
          )}
          {(failed || done) && (
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              aria-label={`Dismiss ${item.name}`}
              className="rounded hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          )}
        </span>
      </div>

      {!failed && !done && (
        <div
          className="h-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={item.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Uploading ${item.name}`}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${item.percent}%` }}
          />
        </div>
      )}
    </li>
  );
}
