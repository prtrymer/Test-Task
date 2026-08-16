import { MaterializedPath } from '../../../shared/domain/materialized-path';
import { AccessPolicy } from './access-policy';
import { AccessTarget, Share, ShareSubject } from './share';

describe('AccessPolicy', () => {
  const OWNER = 'owner-user-id';
  const GRANTEE = 'grantee-user-id';
  const STRANGER = 'stranger-user-id';
  const ROOM = 'room-id';
  const OTHER_ROOM = 'other-room-id';

  const NOW = new Date('2026-08-16T12:00:00Z');
  const LATER = new Date('2026-08-16T13:00:00Z');

  const folderId = 'ffffffff-0000-0000-0000-000000000001';
  const folderPath = MaterializedPath.root().append(folderId);
  const nestedPath = folderPath.append('ffffffff-0000-0000-0000-000000000002');

  const fileInFolder: AccessTarget = {
    kind: 'FILE',
    dataRoomId: ROOM,
    fileId: 'file-1',
    path: folderPath,
  };
  const fileDeeper: AccessTarget = {
    kind: 'FILE',
    dataRoomId: ROOM,
    fileId: 'file-2',
    path: nestedPath,
  };
  const fileAtRoot: AccessTarget = {
    kind: 'FILE',
    dataRoomId: ROOM,
    fileId: 'file-3',
    path: MaterializedPath.root(),
  };

  let counter = 0;
  const restricted = (
    subject: ShareSubject,
    overrides: Partial<{ expiresAt: Date }> = {},
  ) =>
    Share.createRestricted({
      id: `share-${counter++}`,
      dataRoomId: ROOM,
      subject,
      granteeUserId: GRANTEE,
      createdById: OWNER,
      expiresAt: overrides.expiresAt ?? null,
    });

  const evaluate = (userId: string | null, target: AccessTarget, shares: Share[]) =>
    AccessPolicy.evaluate({
      userId,
      dataRoomOwnerId: OWNER,
      target,
      shares,
      now: NOW,
    });

  describe('ownership', () => {
    it('gives the owner read and write', () => {
      const decision = evaluate(OWNER, fileDeeper, []);
      expect(decision).toMatchObject({ canRead: true, canWrite: true, source: 'OWNER' });
    });

    it('denies a stranger holding no share', () => {
      expect(evaluate(STRANGER, fileDeeper, []).canRead).toBe(false);
    });

    it('denies an anonymous caller holding no share', () => {
      expect(evaluate(null, fileDeeper, []).canRead).toBe(false);
    });
  });

  describe('data room shares', () => {
    it('cover everything in the room', () => {
      const shares = [restricted({ type: 'DATA_ROOM' })];
      expect(evaluate(GRANTEE, fileDeeper, shares).canRead).toBe(true);
      expect(evaluate(GRANTEE, fileAtRoot, shares).canRead).toBe(true);
    });

    it('never grant write', () => {
      const decision = evaluate(GRANTEE, fileDeeper, [restricted({ type: 'DATA_ROOM' })]);
      expect(decision).toMatchObject({ canRead: true, canWrite: false, source: 'SHARE' });
    });
  });

  describe('folder shares', () => {
    const shares = () => [restricted({ type: 'FOLDER', folderId, path: folderPath })];

    it('cover the folder itself and everything beneath it', () => {
      expect(evaluate(GRANTEE, fileInFolder, shares()).canRead).toBe(true);
      expect(evaluate(GRANTEE, fileDeeper, shares()).canRead).toBe(true);
    });

    it('do not cover content outside the folder', () => {
      expect(evaluate(GRANTEE, fileAtRoot, shares()).canRead).toBe(false);
    });

    it('do not leak a sibling whose id shares a prefix', () => {
      const shortShare = [
        restricted({
          type: 'FOLDER',
          folderId: 'a',
          path: MaterializedPath.root().append('a'),
        }),
      ];
      const siblingFile: AccessTarget = {
        kind: 'FILE',
        dataRoomId: ROOM,
        fileId: 'file-sibling',
        path: MaterializedPath.root().append('ab'),
      };
      expect(evaluate(GRANTEE, siblingFile, shortShare).canRead).toBe(false);
    });

    it('do not cover the data room as a whole', () => {
      const roomTarget: AccessTarget = { kind: 'DATA_ROOM', dataRoomId: ROOM };
      expect(evaluate(GRANTEE, roomTarget, shares()).canRead).toBe(false);
    });
  });

  describe('file shares', () => {
    const shares = () => [restricted({ type: 'FILE', fileId: 'file-1' })];

    it('cover exactly the named file', () => {
      expect(evaluate(GRANTEE, fileInFolder, shares()).canRead).toBe(true);
    });

    it('do not cover a different file in the same folder', () => {
      expect(evaluate(GRANTEE, fileDeeper, shares()).canRead).toBe(false);
    });

    it('do not cover the containing folder', () => {
      const folderTarget: AccessTarget = {
        kind: 'FOLDER',
        dataRoomId: ROOM,
        folderId,
        path: folderPath,
      };
      expect(evaluate(GRANTEE, folderTarget, shares()).canRead).toBe(false);
    });
  });

  describe('lifecycle', () => {
    it('denies a revoked share', () => {
      const share = restricted({ type: 'DATA_ROOM' });
      share.revoke(NOW);
      expect(evaluate(GRANTEE, fileDeeper, [share]).canRead).toBe(false);
    });

    it('denies an expired share', () => {
      const share = restricted({ type: 'DATA_ROOM' }, { expiresAt: NOW });
      const decision = AccessPolicy.evaluate({
        userId: GRANTEE,
        dataRoomOwnerId: OWNER,
        target: fileDeeper,
        shares: [share],
        now: LATER,
      });
      expect(decision.canRead).toBe(false);
    });

    it('still honours a share that has not yet expired', () => {
      const share = restricted({ type: 'DATA_ROOM' }, { expiresAt: LATER });
      expect(evaluate(GRANTEE, fileDeeper, [share]).canRead).toBe(true);
    });
  });

  it('ignores a share belonging to a different data room', () => {
    const share = Share.createRestricted({
      id: 'cross-room',
      dataRoomId: OTHER_ROOM,
      subject: { type: 'DATA_ROOM' },
      granteeUserId: GRANTEE,
      createdById: OWNER,
    });
    expect(evaluate(GRANTEE, fileDeeper, [share]).canRead).toBe(false);
  });

  it('reports which share granted access', () => {
    const share = restricted({ type: 'FOLDER', folderId, path: folderPath });
    const decision = evaluate(GRANTEE, fileDeeper, [share]);
    expect(decision.grantedBy?.id).toBe(share.id);
  });
});
