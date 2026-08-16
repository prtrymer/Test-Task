'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatBytes } from '@/lib/format';
import type { UploadItem } from './use-uploads';

interface Props {
  items: UploadItem[];
  onDismiss: (id: string) => void;
  onClearFinished: () => void;
}

/**
 * Drive's floating transfer panel: uploads keep running while you navigate, so
 * their progress belongs in a persistent corner rather than inline in a list
 * that changes as you move between folders.
 */
export function UploadPanel({ items, onDismiss, onClearFinished }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  if (!items.length) return null;

  const done = items.filter((i) => i.status === 'done').length;
  const failed = items.filter((i) => i.status === 'error').length;
  const inFlight = items.length - done - failed;

  const heading = inFlight
    ? `Uploading ${inFlight} item${inFlight === 1 ? '' : 's'}`
    : failed
      ? `${done} uploaded, ${failed} failed`
      : `${done} upload${done === 1 ? '' : 's'} complete`;

  return (
    <div className="fixed right-4 bottom-4 z-50 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border bg-background shadow-lg">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
        <p className="truncate text-sm font-medium">{heading}</p>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={collapsed ? 'Expand uploads' : 'Collapse uploads'}
            onClick={() => setCollapsed((c) => !c)}
          >
            <ChevronDown
              className={`size-4 transition-transform ${collapsed ? '' : 'rotate-180'}`}
              aria-hidden
            />
          </Button>
          {!inFlight && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Close uploads"
              onClick={onClearFinished}
            >
              <X className="size-4" aria-hidden />
            </Button>
          )}
        </div>
      </div>

      {!collapsed && (
        <ul className="max-h-64 divide-y overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  {item.status === 'done' && (
                    <CheckCircle2
                      className="size-4 shrink-0 text-emerald-600"
                      aria-hidden
                    />
                  )}
                  {item.status === 'error' && (
                    <AlertCircle
                      className="size-4 shrink-0 text-destructive"
                      aria-hidden
                    />
                  )}
                  <span className="truncate text-sm">{item.name}</span>
                </span>

                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  {item.status === 'error'
                    ? 'Failed'
                    : item.status === 'done'
                      ? formatBytes(item.sizeBytes)
                      : item.status === 'finalising'
                        ? 'Finishing…'
                        : `${item.percent}%`}
                  {(item.status === 'done' || item.status === 'error') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      aria-label={`Dismiss ${item.name}`}
                      onClick={() => onDismiss(item.id)}
                    >
                      <X className="size-3" aria-hidden />
                    </Button>
                  )}
                </span>
              </div>

              {item.status === 'error' && (
                <p className="mt-1 text-xs text-destructive">{item.error}</p>
              )}

              {item.versioned && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Saved as a new version
                </p>
              )}

              {(item.status === 'uploading' || item.status === 'queued') && (
                <Progress
                  value={item.percent}
                  className="mt-2 h-1"
                  aria-label={`Uploading ${item.name}`}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
