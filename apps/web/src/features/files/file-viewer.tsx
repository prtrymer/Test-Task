'use client';

import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state';
import { files } from '@/lib/api/resources';
import { formatBytes } from '@/lib/format';

interface Props {
  dataRoomId: string;
  fileId: string | null;
  fileName?: string;
  shareToken?: string | null;
  onClose: () => void;
}

export function FileViewer({ dataRoomId, fileId, fileName, shareToken, onClose }: Props) {
  const file = useQuery({
    queryKey: ['file-url', dataRoomId, fileId],
    queryFn: () => files.url(dataRoomId, fileId as string, { shareToken }),
    enabled: Boolean(fileId),
    gcTime: 0,
    staleTime: 0,
  });

  return (
    <Dialog open={Boolean(fileId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[85vh] w-full flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">
            {file.data?.name ?? fileName ?? 'Document'}
            {file.data && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {formatBytes(file.data.sizeBytes)}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1">
          {file.isPending && <Skeleton className="size-full" />}

          {file.isError && (
            <ErrorState error={file.error} onRetry={() => file.refetch()} />
          )}

          {file.data && (
            <iframe
              src={file.data.url}
              title={file.data.name}
              className="size-full rounded-md border"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
