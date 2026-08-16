import { ValidationError } from './domain-error';
import { MaterializedPath } from './materialized-path';

describe('MaterializedPath', () => {
  const a = 'aaaaaaaa-0000-0000-0000-000000000001';
  const b = 'bbbbbbbb-0000-0000-0000-000000000002';
  const c = 'cccccccc-0000-0000-0000-000000000003';

  it('starts at the root', () => {
    const root = MaterializedPath.root();
    expect(root.value).toBe('/');
    expect(root.isRoot()).toBe(true);
    expect(root.depth).toBe(0);
  });

  it('appends ids as slash-delimited segments', () => {
    const path = MaterializedPath.root().append(a).append(b);
    expect(path.value).toBe(`/${a}/${b}/`);
    expect(path.depth).toBe(2);
    expect(path.segments).toEqual([a, b]);
  });

  it('rejects a malformed path', () => {
    expect(() => MaterializedPath.fromString('no-slashes')).toThrow(ValidationError);
    expect(() => MaterializedPath.fromString('/missing-trailing')).toThrow(
      ValidationError,
    );
  });

  it('rejects a segment containing a slash', () => {
    expect(() => MaterializedPath.root().append('a/b')).toThrow(ValidationError);
  });

  it('refuses to nest beyond the depth limit', () => {
    let path = MaterializedPath.root();
    for (let i = 0; i < MaterializedPath.MAX_DEPTH; i++) {
      path = path.append(`seg${i}`);
    }
    expect(() => path.append('one-too-many')).toThrow(ValidationError);
  });

  describe('containment', () => {
    it('contains its descendants', () => {
      const parent = MaterializedPath.root().append(a);
      const child = parent.append(b);
      const grandchild = child.append(c);

      expect(parent.contains(child)).toBe(true);
      expect(parent.contains(grandchild)).toBe(true);
      expect(child.contains(parent)).toBe(false);
    });

    it('does not mistake a sibling with a shared prefix for a descendant', () => {
      const shortId = MaterializedPath.root().append('a');
      const longerId = MaterializedPath.root().append('ab');

      expect(shortId.contains(longerId)).toBe(false);
      expect(longerId.contains(shortId)).toBe(false);
    });
  });

  it('builds a subtree LIKE pattern', () => {
    const path = MaterializedPath.root().append(a);
    expect(path.toSubtreePattern()).toBe(`/${a}/%`);
  });

  it('walks back to the parent', () => {
    const child = MaterializedPath.root().append(a).append(b);
    expect(child.parent().value).toBe(`/${a}/`);
    expect(child.parent().parent().isRoot()).toBe(true);
    expect(MaterializedPath.root().parent().isRoot()).toBe(true);
  });

  describe('reparent', () => {
    it('rewrites a descendant path when its ancestor moves', () => {
      const oldParent = MaterializedPath.root().append(a);
      const descendant = oldParent.append(b).append(c);
      const newParent = MaterializedPath.root().append('zzzz').append(a);

      const moved = descendant.reparent(oldParent, newParent);

      expect(moved.value).toBe(`/zzzz/${a}/${b}/${c}/`);
      expect(newParent.contains(moved)).toBe(true);
    });

    it('refuses to rewrite a path that does not lie beneath the source', () => {
      const unrelated = MaterializedPath.root().append(c);
      const from = MaterializedPath.root().append(a);
      const to = MaterializedPath.root().append(b);

      expect(() => unrelated.reparent(from, to)).toThrow(ValidationError);
    });
  });
});
