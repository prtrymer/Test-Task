/**
 * Query keys as a single hierarchy, so invalidating a data room reaches every
 * listing beneath it without each mutation having to enumerate them.
 */
export const keys = {
  session: ['session'] as const,

  dataRooms: ['data-rooms'] as const,
  dataRoom: (id: string) => ['data-rooms', id] as const,

  entries: (id: string, folderId: string | null, sort: string) =>
    ['data-rooms', id, 'entries', folderId ?? 'root', sort] as const,

  breadcrumbs: (id: string, folderId: string) =>
    ['data-rooms', id, 'breadcrumbs', folderId] as const,

  folderStats: (id: string, folderId: string) =>
    ['data-rooms', id, 'stats', folderId] as const,

  search: (id: string, term: string, folderId: string | null) =>
    ['data-rooms', id, 'search', term, folderId ?? 'all'] as const,

  sharesForSubject: (id: string, folderId?: string | null, fileId?: string | null) =>
    ['data-rooms', id, 'shares', folderId ?? null, fileId ?? null] as const,

  sharedWithMe: ['shared-with-me'] as const,
};
