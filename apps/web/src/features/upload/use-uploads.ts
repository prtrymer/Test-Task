'use client';

import { useCallback, useRef, useState } from 'react';
import { isApiError } from '@/lib/api/errors';
import { files } from '@/lib/api/resources';
import { uploadToStorage } from '@/lib/api/upload';

export type UploadStatus = 'queued' | 'uploading' | 'finalising' | 'done' | 'error';

export interface UploadItem {
  id: string;
  name: string;
  sizeBytes: number;
  status: UploadStatus;
  percent: number;
  error?: string;

  versioned?: boolean;
}

const ACCEPTED_TYPE = 'application/pdf';
const MAX_BYTES = 100 * 1024 * 1024;

const CONCURRENCY = 3;

interface Options {
  dataRoomId: string;
  folderId: string | null;
  onCommitted: () => void;
}

export function useUploads({ dataRoomId, folderId, onCommitted }: Options) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const counter = useRef(0);

  const patch = useCallback((id: string, changes: Partial<UploadItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  }, []);

  const runOne = useCallback(
    async (id: string, file: File) => {
      try {
        patch(id, { status: 'uploading', percent: 0 });

        const ticket = await files.requestTicket(dataRoomId, {
          name: file.name,
          contentType: ACCEPTED_TYPE,
          folderId,
        });

        await uploadToStorage({
          url: ticket.uploadUrl,
          file,
          onProgress: ({ percent }) => patch(id, { percent }),
        });

        patch(id, { status: 'finalising', percent: 100 });

        const committed = await files.commit(dataRoomId, {
          name: file.name,
          blobPathname: ticket.pathname,
          folderId,
        });

        patch(id, { status: 'done', versioned: committed.versioned });
      } catch (error) {
        patch(id, {
          status: 'error',
          error: isApiError(error) ? error.message : 'Upload failed',
        });
      }
    },
    [dataRoomId, folderId, patch],
  );

  const enqueue = useCallback(
    async (selected: File[]) => {
      const accepted: { id: string; file: File }[] = [];
      const rejected: UploadItem[] = [];

      for (const file of selected) {
        const id = `upload-${counter.current++}`;
        const base = { id, name: file.name, sizeBytes: file.size, percent: 0 };

        if (file.type !== ACCEPTED_TYPE) {
          rejected.push({
            ...base,
            status: 'error',
            error: 'Only PDF files are accepted',
          });
        } else if (file.size > MAX_BYTES) {
          rejected.push({
            ...base,
            status: 'error',
            error: 'Larger than the 100 MB limit',
          });
        } else {
          accepted.push({ id, file });
          rejected.push({ ...base, status: 'queued' });
        }
      }

      setItems((current) => [...rejected, ...current]);

      const queue = [...accepted];
      const workers = Array.from(
        { length: Math.min(CONCURRENCY, queue.length) },
        async () => {
          let next = queue.shift();
          while (next) {
            await runOne(next.id, next.file);
            next = queue.shift();
          }
        },
      );

      await Promise.all(workers);
      onCommitted();
    },
    [runOne, onCommitted],
  );

  const clearFinished = useCallback(() => {
    setItems((current) => current.filter((item) => item.status !== 'done'));
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const active = items.some(
    (item) => item.status === 'uploading' || item.status === 'finalising',
  );

  return { items, enqueue, clearFinished, dismiss, active };
}
