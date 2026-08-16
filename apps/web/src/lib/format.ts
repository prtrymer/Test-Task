const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/** Sizes arrive as strings because they are BigInt server-side. */
export function formatBytes(value: string | number | bigint): string {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    UNITS.length - 1,
  );
  const size = bytes / 1024 ** exponent;

  return `${size.toFixed(exponent === 0 ? 0 : 1)} ${UNITS[exponent]}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const elapsed = now - date.getTime();

  if (elapsed < 60_000) return 'just now';
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`;

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

/** "3 folders and 12 files" — used in the delete warning. */
export function describeContents(folderCount: number, fileCount: number): string {
  const parts: string[] = [];
  if (folderCount) parts.push(`${folderCount} folder${folderCount === 1 ? '' : 's'}`);
  if (fileCount) parts.push(`${fileCount} file${fileCount === 1 ? '' : 's'}`);
  if (!parts.length) return 'nothing';
  return parts.join(' and ');
}
