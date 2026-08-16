import { ApiError } from './errors';

export interface UploadProgress {
  loaded: number;
  total: number;
  /** 0–100, clamped. */
  percent: number;
}

/**
 * Sends bytes straight to blob storage using the presigned URL.
 *
 * XHR rather than fetch: fetch still has no upload progress event, and per-file
 * progress is a stated requirement. This is also why the bytes never touch the
 * API — Vercel functions cap bodies at 4.5 MB.
 */
export function uploadToStorage(input: {
  url: string;
  file: File;
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const { url, file, onProgress, signal } = input;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('content-type', file.type || 'application/octet-stream');

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress({
        loaded: event.loaded,
        total: event.total,
        percent: Math.min(100, Math.round((event.loaded / event.total) * 100)),
      });
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.({ loaded: file.size, total: file.size, percent: 100 });
        resolve();
        return;
      }
      reject(
        new ApiError(
          xhr.status,
          xhr.status === 413 ? 'VALIDATION_ERROR' : 'UNKNOWN',
          xhr.status === 413
            ? 'That file is larger than the upload limit'
            : 'The upload failed',
        ),
      );
    });

    xhr.addEventListener('error', () =>
      reject(new ApiError(0, 'NETWORK', 'The upload could not reach storage')),
    );

    xhr.addEventListener('abort', () =>
      reject(new ApiError(0, 'NETWORK', 'Upload cancelled')),
    );

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    xhr.send(file);
  });
}
