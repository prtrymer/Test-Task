'use client';

import { useQuery } from '@tanstack/react-query';
import { use } from 'react';
import { Vault } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state';
import { Browser } from '@/features/browser/browser';
import { FileViewer } from '@/features/files/file-viewer';
import { api } from '@/lib/api/client';
import type { ResolvedShareLink } from '@/lib/api/types';

/**
 * The public-link surface. No sign-in required: the token in this URL is the
 * credential, and it travels to the API in the X-Share-Token header rather than
 * a query string, so it stays out of access logs and Referer headers.
 */
export default function PublicSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  // The token resolves server-side; the client only learns what it opens by
  // asking. Anything it may not see comes back as 404.
  const resolved = useQuery({
    queryKey: ['public-share', token],
    queryFn: () =>
      api.get<ResolvedShareLink>('/share-links/resolve', { shareToken: token }),
    retry: false,
  });

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <span className="flex items-center gap-2 font-medium">
            <Vault className="size-4" aria-hidden />
            Data Room
          </span>
          <Badge variant="secondary">Shared link · read-only</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {resolved.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : resolved.isError ? (
          <ErrorState error={resolved.error} />
        ) : (
          <div className="space-y-6">
            <h1 className="text-2xl font-semibold tracking-tight">
              {resolved.data.dataRoomName}
            </h1>

            {resolved.data.subjectType === 'FILE' ? (
              <FileViewer
                dataRoomId={resolved.data.dataRoomId}
                fileId={resolved.data.subjectFileId}
                shareToken={token}
                onClose={() => undefined}
              />
            ) : (
              <Browser
                dataRoomId={resolved.data.dataRoomId}
                roomName={resolved.data.dataRoomName}
                readOnly
                shareToken={token}
                rootFolderId={resolved.data.subjectFolderId}
                rootLabel={
                  resolved.data.subjectType === 'FOLDER'
                    ? 'Shared folder'
                    : resolved.data.dataRoomName
                }
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
