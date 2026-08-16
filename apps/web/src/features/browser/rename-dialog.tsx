'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isApiError } from '@/lib/api/errors';
import { files, folders } from '@/lib/api/resources';
import type { DirectoryEntry } from '@/lib/api/types';

interface Props {
  dataRoomId: string;
  entry: DirectoryEntry | null;
  onClose: () => void;
  onRenamed: () => void;
}

export function RenameDialog({ dataRoomId, entry, onClose, onRenamed }: Props) {
  const [name, setName] = useState('');
  const [seededFor, setSeededFor] = useState<string | null>(null);

  // Seeding during render rather than in an effect: React re-runs this component
  // before committing, so the input is correct on first paint instead of
  // flashing the previous entry's name.
  if (entry && entry.id !== seededFor) {
    setSeededFor(entry.id);
    setName(entry.name);
  }

  const rename = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!entry) throw new Error('Nothing selected');
      if (entry.kind === 'folder') {
        await folders.rename(dataRoomId, entry.id, name.trim());
      } else {
        await files.rename(dataRoomId, entry.id, name.trim());
      }
    },
    onSuccess: () => {
      toast.success('Renamed');
      onRenamed();
      onClose();
    },
    onError: (error) =>
      toast.error(isApiError(error) ? error.message : 'Could not rename that'),
  });

  const unchanged = entry ? name.trim() === entry.name : true;

  return (
    <Dialog open={Boolean(entry)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() && !unchanged) rename.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              Rename {entry?.kind === 'folder' ? 'folder' : 'file'}
            </DialogTitle>
            <DialogDescription>
              {/* Uploads resolve a clash by versioning; a rename cannot, because
                  the two files have separate histories. */}
              Names must be unique within a folder.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="rename-input">Name</Label>
            <Input
              id="rename-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={255}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || unchanged || rename.isPending}
            >
              {rename.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
