import { api } from './client';
import type {
  Breadcrumb,
  CommittedFile,
  DataRoom,
  DirectoryEntry,
  FileEntry,
  FileResource,
  FileUrl,
  Folder,
  Page,
  Session,
  Share,
  SharedRoomSummary,
  ShareMode,
  ShareSubjectType,
  SubtreeStats,
  UploadTicket,
  User,
} from './types';

export interface Scoped {
  shareToken?: string | null;
}

export const auth = {
  register: (body: { email: string; password: string; name?: string }) =>
    api.post<Session>('/auth/register', body),

  login: (body: { email: string; password: string }) =>
    api.post<Session>('/auth/login', body),

  me: () => api.get<User>('/auth/me'),
};

export const dataRooms = {
  list: () => api.get<{ items: DataRoom[] }>('/data-rooms'),

  get: (id: string, scope: Scoped = {}) => api.get<DataRoom>(`/data-rooms/${id}`, scope),

  create: (name: string) => api.post<DataRoom>('/data-rooms', { name }),

  rename: (id: string, name: string) => api.patch<void>(`/data-rooms/${id}`, { name }),

  remove: (id: string) => api.delete<void>(`/data-rooms/${id}`),

  entries: (
    id: string,
    params: {
      folderId?: string | null;
      cursor?: string | null;
      sort?: 'name' | 'updatedAt';
    },
    scope: Scoped = {},
  ) => {
    const query = new URLSearchParams();
    if (params.folderId) query.set('folderId', params.folderId);
    if (params.cursor) query.set('cursor', params.cursor);
    if (params.sort) query.set('sort', params.sort);
    const suffix = query.size ? `?${query}` : '';
    return api.get<Page<DirectoryEntry>>(`/data-rooms/${id}/entries${suffix}`, scope);
  },

  search: (
    id: string,
    params: { q: string; folderId?: string | null; cursor?: string | null },
    scope: Scoped = {},
  ) => {
    const query = new URLSearchParams({ q: params.q });
    if (params.folderId) query.set('folderId', params.folderId);
    if (params.cursor) query.set('cursor', params.cursor);
    return api.get<Page<FileEntry>>(`/data-rooms/${id}/search?${query}`, scope);
  },

  breadcrumbs: (id: string, folderId: string, scope: Scoped = {}) =>
    api.get<{ items: Breadcrumb[] }>(
      `/data-rooms/${id}/folders/${folderId}/breadcrumbs`,
      scope,
    ),

  folderStats: (id: string, folderId: string, scope: Scoped = {}) =>
    api.get<SubtreeStats>(`/data-rooms/${id}/folders/${folderId}/stats`, scope),
};

export const folders = {
  create: (dataRoomId: string, body: { name: string; parentId?: string | null }) =>
    api.post<Folder>(`/data-rooms/${dataRoomId}/folders`, body),

  rename: (dataRoomId: string, folderId: string, name: string) =>
    api.patch<Folder>(`/data-rooms/${dataRoomId}/folders/${folderId}`, { name }),

  move: (dataRoomId: string, folderId: string, newParentId: string | null) =>
    api.post<Folder>(`/data-rooms/${dataRoomId}/folders/${folderId}/move`, {
      newParentId,
    }),

  deletionPreview: (dataRoomId: string, folderId: string) =>
    api.get<SubtreeStats>(
      `/data-rooms/${dataRoomId}/folders/${folderId}/deletion-preview`,
    ),

  remove: (dataRoomId: string, folderId: string) =>
    api.delete<{ removed: SubtreeStats }>(
      `/data-rooms/${dataRoomId}/folders/${folderId}`,
    ),
};

export const files = {
  requestTicket: (
    dataRoomId: string,
    body: { name: string; contentType: string; folderId?: string | null },
  ) => api.post<UploadTicket>(`/data-rooms/${dataRoomId}/files/upload-ticket`, body),

  commit: (
    dataRoomId: string,
    body: { name: string; blobPathname: string; folderId?: string | null },
  ) => api.post<CommittedFile>(`/data-rooms/${dataRoomId}/files`, body),

  url: (dataRoomId: string, fileId: string, scope: Scoped = {}) =>
    api.get<FileUrl>(`/data-rooms/${dataRoomId}/files/${fileId}/url`, scope),

  rename: (dataRoomId: string, fileId: string, name: string) =>
    api.patch<FileResource>(`/data-rooms/${dataRoomId}/files/${fileId}`, { name }),

  move: (dataRoomId: string, fileId: string, folderId: string | null) =>
    api.post<FileResource>(`/data-rooms/${dataRoomId}/files/${fileId}/move`, {
      folderId,
    }),

  remove: (dataRoomId: string, fileId: string) =>
    api.delete<void>(`/data-rooms/${dataRoomId}/files/${fileId}`),
};

export const shares = {
  create: (
    dataRoomId: string,
    body: {
      subjectType: ShareSubjectType;
      subjectFolderId?: string | null;
      subjectFileId?: string | null;
      mode: ShareMode;
      granteeEmail?: string | null;
      expiresAt?: string | null;
    },
  ) => api.post<Share>(`/data-rooms/${dataRoomId}/shares`, body),

  listForSubject: (
    dataRoomId: string,
    params: { folderId?: string | null; fileId?: string | null },
  ) => {
    const query = new URLSearchParams();
    if (params.folderId) query.set('folderId', params.folderId);
    if (params.fileId) query.set('fileId', params.fileId);
    const suffix = query.size ? `?${query}` : '';
    return api.get<{ items: Share[] }>(`/data-rooms/${dataRoomId}/shares${suffix}`);
  },

  revoke: (shareId: string) => api.delete<void>(`/shares/${shareId}`),

  sharedWithMe: () => api.get<{ items: SharedRoomSummary[] }>('/shared-with-me'),
};
