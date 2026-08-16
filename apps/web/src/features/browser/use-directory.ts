'use client';

import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { dataRooms } from '@/lib/api/resources';
import { keys } from '@/lib/query/keys';
import type { DirectoryEntry } from '@/lib/api/types';

export interface BrowseScope {
  dataRoomId: string;
  folderId: string | null;
  shareToken?: string | null;
}

export function useDirectory(scope: BrowseScope, sort: 'name' | 'updatedAt' = 'name') {
  const query = useInfiniteQuery({
    queryKey: keys.entries(scope.dataRoomId, scope.folderId, sort),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      dataRooms.entries(
        scope.dataRoomId,
        { folderId: scope.folderId, cursor: pageParam, sort },
        { shareToken: scope.shareToken },
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const entries: DirectoryEntry[] = query.data?.pages.flatMap((page) => page.items) ?? [];

  return { ...query, entries };
}

export function useBreadcrumbs(scope: BrowseScope) {
  return useQuery({
    queryKey: keys.breadcrumbs(scope.dataRoomId, scope.folderId ?? 'root'),
    queryFn: () =>
      dataRooms.breadcrumbs(scope.dataRoomId, scope.folderId as string, {
        shareToken: scope.shareToken,
      }),
    enabled: Boolean(scope.folderId),
  });
}

export function useRefreshRoom(dataRoomId: string) {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: keys.dataRoom(dataRoomId) }),
    [queryClient, dataRoomId],
  );
}
