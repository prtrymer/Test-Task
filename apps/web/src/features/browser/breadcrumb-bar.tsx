'use client';

import { ChevronRight } from 'lucide-react';
import type { Breadcrumb } from '@/lib/api/types';

interface Props {
  roomName: string;
  trail: Breadcrumb[];
  /** Null navigates to the room root. */
  onNavigate: (folderId: string | null) => void;
  /**
   * A recipient browsing a shared folder starts there — anything above it is
   * not theirs to see, so the room root is not offered as a destination.
   */
  rootLabel?: string;
  rootNavigable?: boolean;
}

export function BreadcrumbBar({
  roomName,
  trail,
  onNavigate,
  rootLabel,
  rootNavigable = true,
}: Props) {
  const crumbs = trail.slice(0, -1);
  const current = trail.at(-1);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      <BreadcrumbItem
        label={rootLabel ?? roomName}
        onClick={rootNavigable ? () => onNavigate(null) : undefined}
        isCurrent={!current}
      />

      {crumbs.map((crumb) => (
        <span key={crumb.id} className="flex items-center gap-1">
          <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />
          <BreadcrumbItem label={crumb.name} onClick={() => onNavigate(crumb.id)} />
        </span>
      ))}

      {current && (
        <span className="flex items-center gap-1">
          <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />
          <BreadcrumbItem label={current.name} isCurrent />
        </span>
      )}
    </nav>
  );
}

function BreadcrumbItem({
  label,
  onClick,
  isCurrent,
}: {
  label: string;
  onClick?: () => void;
  isCurrent?: boolean;
}) {
  if (isCurrent || !onClick) {
    return (
      <span
        aria-current={isCurrent ? 'page' : undefined}
        className={isCurrent ? 'font-medium' : 'text-muted-foreground'}
      >
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {label}
    </button>
  );
}
