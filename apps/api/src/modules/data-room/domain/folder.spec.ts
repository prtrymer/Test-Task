import { ConflictError, ValidationError } from '../../../shared/domain/domain-error';
import { Folder } from './folder';

describe('Folder', () => {
  const ROOM = 'room-id';
  const ROOT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
  const CHILD_ID = 'bbbbbbbb-0000-0000-0000-000000000002';
  const GRANDCHILD_ID = 'cccccccc-0000-0000-0000-000000000003';

  const makeTree = () => {
    const root = Folder.create({
      id: ROOT_ID,
      dataRoomId: ROOM,
      parent: null,
      name: 'Financials',
    });
    const child = Folder.create({
      id: CHILD_ID,
      dataRoomId: ROOM,
      parent: root,
      name: 'Q4',
    });
    const grandchild = Folder.create({
      id: GRANDCHILD_ID,
      dataRoomId: ROOM,
      parent: child,
      name: 'Statements',
    });
    return { root, child, grandchild };
  };

  describe('creation', () => {
    it('places a top-level folder directly under the root', () => {
      const { root } = makeTree();
      expect(root.path.value).toBe(`/${ROOT_ID}/`);
      expect(root.parentId).toBeNull();
      expect(root.depth).toBe(0);
    });

    it('nests a child beneath its parent', () => {
      const { child } = makeTree();
      expect(child.path.value).toBe(`/${ROOT_ID}/${CHILD_ID}/`);
      expect(child.parentId).toBe(ROOT_ID);
      expect(child.depth).toBe(1);
    });

    it('rejects a parent in another data room', () => {
      const foreign = Folder.create({
        id: ROOT_ID,
        dataRoomId: 'other-room',
        parent: null,
        name: 'Elsewhere',
      });
      expect(() =>
        Folder.create({ id: CHILD_ID, dataRoomId: ROOM, parent: foreign, name: 'Q4' }),
      ).toThrow(ValidationError);
    });

    it('rejects an empty name', () => {
      expect(() =>
        Folder.create({ id: ROOT_ID, dataRoomId: ROOM, parent: null, name: '   ' }),
      ).toThrow(ValidationError);
    });
  });

  describe('rename', () => {
    it('leaves the path untouched, since paths are built from ids', () => {
      const { child } = makeTree();
      const before = child.path.value;
      child.rename('Q4 Revised');
      expect(child.name.value).toBe('Q4 Revised');
      expect(child.path.value).toBe(before);
    });

    it('rejects a name containing a slash', () => {
      const { child } = makeTree();
      expect(() => child.rename('a/b')).toThrow(ValidationError);
    });
  });

  describe('move', () => {
    it('reports the path rewrite descendants must apply', () => {
      const { root, child } = makeTree();
      const other = Folder.create({
        id: 'dddddddd-0000-0000-0000-000000000004',
        dataRoomId: ROOM,
        parent: null,
        name: 'Legal',
      });

      const { from, to } = child.moveTo(other);

      expect(from.value).toBe(`/${ROOT_ID}/${CHILD_ID}/`);
      expect(to.value).toBe(`/${other.id}/${CHILD_ID}/`);
      expect(child.parentId).toBe(other.id);
      expect(root.path.contains(child.path)).toBe(false);
    });

    it('moves a folder up to the root', () => {
      const { child } = makeTree();
      const { to } = child.moveTo(null);
      expect(to.value).toBe(`/${CHILD_ID}/`);
      expect(child.parentId).toBeNull();
    });

    it('refuses to move a folder into its own descendant', () => {
      const { root, grandchild } = makeTree();
      expect(() => root.moveTo(grandchild)).toThrow(ConflictError);
    });

    it('refuses to move a folder into itself', () => {
      const { child } = makeTree();
      expect(() => child.moveTo(child)).toThrow(ConflictError);
    });

    it('refuses a move that changes nothing', () => {
      const { root, child } = makeTree();
      expect(() => child.moveTo(root)).toThrow(ConflictError);
    });

    it('refuses a move across data rooms', () => {
      const { child } = makeTree();
      const foreign = Folder.create({
        id: 'eeeeeeee-0000-0000-0000-000000000005',
        dataRoomId: 'other-room',
        parent: null,
        name: 'Elsewhere',
      });
      expect(() => child.moveTo(foreign)).toThrow(ValidationError);
    });
  });

  it('round-trips through a snapshot', () => {
    const { grandchild } = makeTree();
    const restored = Folder.rehydrate(grandchild.toSnapshot());
    expect(restored.toSnapshot()).toEqual(grandchild.toSnapshot());
  });
});
