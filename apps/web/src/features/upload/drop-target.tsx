'use client';

import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { CloudUpload } from 'lucide-react';

interface Props {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  label?: string;
  children: ReactNode;
}

export function DropTarget({ onFiles, disabled = false, label, children }: Props) {
  const [isOver, setIsOver] = useState(false);

  const depth = useRef(0);

  if (disabled) return <>{children}</>;

  const carriesFiles = (event: DragEvent) =>
    Array.from(event.dataTransfer?.types ?? []).includes('Files');

  return (
    <div
      className="relative min-h-full"
      onDragEnter={(event) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        depth.current += 1;
        setIsOver(true);
      }}
      onDragOver={(event) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
      }}
      onDragLeave={(event) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        depth.current -= 1;
        if (depth.current <= 0) setIsOver(false);
      }}
      onDrop={(event) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        depth.current = 0;
        setIsOver(false);
        const dropped = Array.from(event.dataTransfer.files);
        if (dropped.length) onFiles(dropped);
      }}
    >
      {children}

      {isOver && (
        <div className="pointer-events-none absolute inset-2 z-40 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-[1px]">
          <CloudUpload className="size-8 text-primary" aria-hidden />
          <p className="text-sm font-medium text-primary">
            Drop PDFs to upload{label ? ` to ${label}` : ''}
          </p>
        </div>
      )}
    </div>
  );
}
