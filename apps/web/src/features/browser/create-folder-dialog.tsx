'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { FolderPlus } from 'lucide-react';
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
import { folders } from '@/lib/api/resources';

interface Props {
  dataRoomId: string;
  parentId: string | null;
  onCreated: () => void;
}

export function CreateFolderDialog({ dataRoomId, parentId, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const create = useMutation({
    mutationFn: () => folders.create(dataRoomId, { name: name.trim(), parentId }),
    onSuccess: (folder) => {
      toast.success(`Created “${folder.name}”`);
      onCreated();
      setOpen(false);
      setName('');
    },
    onError: (error) =>
      toast.error(isApiError(error) ? error.message : 'Could not create the folder'),
  });

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FolderPlus className="size-4" aria-hidden />
        New folder
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setName('');
        }}
      >
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) create.mutate();
            }}
          >
            <DialogHeader>
              <DialogTitle>New folder</DialogTitle>
              <DialogDescription>
                Created inside the folder you&apos;re currently viewing.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-4">
              <Label htmlFor="folder-name">Name</Label>
              <Input
                id="folder-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Financials"
                autoFocus
                maxLength={255}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || create.isPending}>
                {create.isPending ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
