'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Check, Copy, Link2, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { isApiError } from '@/lib/api/errors';
import { shares } from '@/lib/api/resources';
import { keys } from '@/lib/query/keys';
import type { ShareSubjectType } from '@/lib/api/types';

export interface ShareTarget {
  subjectType: ShareSubjectType;
  subjectFolderId?: string | null;
  subjectFileId?: string | null;
  label: string;
}

interface Props {
  dataRoomId: string;
  target: ShareTarget | null;
  onClose: () => void;
}

export function ShareDialog({ dataRoomId, target, onClose }: Props) {
  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">Share “{target?.label}”</DialogTitle>
          <DialogDescription>
            Recipients get read-only access, including everything nested inside.
          </DialogDescription>
        </DialogHeader>

        {target && <ShareBody dataRoomId={dataRoomId} target={target} />}
      </DialogContent>
    </Dialog>
  );
}

function ShareBody({ dataRoomId, target }: { dataRoomId: string; target: ShareTarget }) {
  const queryClient = useQueryClient();
  const queryKey = keys.sharesForSubject(
    dataRoomId,
    target.subjectFolderId,
    target.subjectFileId,
  );

  const existing = useQuery({
    queryKey,
    queryFn: () =>
      shares.listForSubject(dataRoomId, {
        folderId: target.subjectFolderId,
        fileId: target.subjectFileId,
      }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey });

  return (
    <Tabs defaultValue="people" className="space-y-4">
      <TabsList className="w-full">
        <TabsTrigger value="people" className="flex-1">
          <UserPlus className="size-4" aria-hidden />
          Specific people
        </TabsTrigger>
        <TabsTrigger value="link" className="flex-1">
          <Link2 className="size-4" aria-hidden />
          Public link
        </TabsTrigger>
      </TabsList>

      <TabsContent value="people" className="space-y-4">
        <InviteForm dataRoomId={dataRoomId} target={target} onDone={refresh} />
        <ShareList
          query={existing}
          mode="RESTRICTED"
          onRevoked={refresh}
          emptyLabel="Nobody has been given access yet."
        />
      </TabsContent>

      <TabsContent value="link" className="space-y-4">
        <CreateLinkButton dataRoomId={dataRoomId} target={target} onDone={refresh} />
        <ShareList
          query={existing}
          mode="PUBLIC_LINK"
          onRevoked={refresh}
          emptyLabel="No public links yet."
        />
      </TabsContent>
    </Tabs>
  );
}

function InviteForm({
  dataRoomId,
  target,
  onDone,
}: {
  dataRoomId: string;
  target: ShareTarget;
  onDone: () => void;
}) {
  const [email, setEmail] = useState('');

  const invite = useMutation({
    mutationFn: () =>
      shares.create(dataRoomId, {
        subjectType: target.subjectType,
        subjectFolderId: target.subjectFolderId,
        subjectFileId: target.subjectFileId,
        mode: 'RESTRICTED',
        granteeEmail: email.trim(),
      }),
    onSuccess: () => {
      toast.success(`Shared with ${email.trim()}`);
      setEmail('');
      onDone();
    },
    onError: (error) =>
      toast.error(isApiError(error) ? error.message : 'Could not share this'),
  });

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (email.trim()) invite.mutate();
      }}
    >
      <Label htmlFor="grantee-email">Email address</Label>
      <div className="flex gap-2">
        <Input
          id="grantee-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@company.com"
        />
        <Button type="submit" disabled={!email.trim() || invite.isPending}>
          {invite.isPending ? 'Sharing…' : 'Share'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        They need an account already — we don&apos;t send invitations yet.
      </p>
    </form>
  );
}

function CreateLinkButton({
  dataRoomId,
  target,
  onDone,
}: {
  dataRoomId: string;
  target: ShareTarget;
  onDone: () => void;
}) {
  const create = useMutation({
    mutationFn: () =>
      shares.create(dataRoomId, {
        subjectType: target.subjectType,
        subjectFolderId: target.subjectFolderId,
        subjectFileId: target.subjectFileId,
        mode: 'PUBLIC_LINK',
      }),
    onSuccess: async (share) => {
      onDone();
      if (share.token) await copyShareLink(share.token);
    },
    onError: (error) =>
      toast.error(isApiError(error) ? error.message : 'Could not create the link'),
  });

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        className="w-full"
        onClick={() => create.mutate()}
        disabled={create.isPending}
      >
        <Link2 className="size-4" aria-hidden />
        {create.isPending ? 'Creating…' : 'Create a public link'}
      </Button>
      <p className="text-xs text-muted-foreground">
        Anyone with the link can view. Revoke it at any time.
      </p>
    </div>
  );
}

function ShareList({
  query,
  mode,
  onRevoked,
  emptyLabel,
}: {
  query: ReturnType<typeof useQuery<{ items: import('@/lib/api/types').Share[] }>>;
  mode: 'RESTRICTED' | 'PUBLIC_LINK';
  onRevoked: () => void;
  emptyLabel: string;
}) {
  const revoke = useMutation({
    mutationFn: (shareId: string) => shares.revoke(shareId),
    onSuccess: () => {
      toast.success('Access revoked');
      onRevoked();
    },
    onError: (error) =>
      toast.error(isApiError(error) ? error.message : 'Could not revoke that'),
  });

  if (query.isPending) return <Skeleton className="h-16 w-full" />;
  if (query.isError) return null;

  const items = query.data.items.filter((share) => share.mode === mode);

  if (!items.length) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ul className="divide-y rounded-md border">
      {items.map((share) => (
        <li
          key={share.id}
          className="flex items-center justify-between gap-3 px-3 py-2.5"
        >
          <span className="min-w-0 truncate text-sm">
            {share.mode === 'PUBLIC_LINK' ? 'Anyone with the link' : 'Invited person'}
          </span>

          <span className="flex shrink-0 items-center gap-1">
            {share.mode === 'PUBLIC_LINK' && share.token && (
              <CopyLinkButton token={share.token} />
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Revoke access"
              onClick={() => revoke.mutate(share.id)}
              disabled={revoke.isPending}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </span>
        </li>
      ))}
    </ul>
  );
}

function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Copy link"
      onClick={async () => {
        const ok = await copyShareLink(token);
        if (ok) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }
      }}
    >
      {copied ? (
        <Check className="size-4 text-emerald-600" aria-hidden />
      ) : (
        <Copy className="size-4" aria-hidden />
      )}
    </Button>
  );
}

async function copyShareLink(token: string): Promise<boolean> {
  const url = `${window.location.origin}/share/${token}`;
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
    return true;
  } catch {
    toast.info(url, { duration: 10_000, description: 'Copy this link' });
    return false;
  }
}
