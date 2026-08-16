import { ValidationError } from './domain-error';

/**
 * A folder's position in the tree, encoded as its ancestors' ids:
 * `/<rootId>/<childId>/`. Files carry their parent folder's path.
 *
 * Built from ids rather than names, so renaming never rewrites paths — only
 * moves do. The trailing slash is what makes prefix comparison safe: without
 * it, `/ab/` would appear to sit beneath `/a/`.
 */
export class MaterializedPath {
  static readonly MAX_DEPTH = 64;

  private constructor(readonly value: string) {}

  static root(): MaterializedPath {
    return new MaterializedPath('/');
  }

  static fromString(raw: string): MaterializedPath {
    if (!raw.startsWith('/') || !raw.endsWith('/')) {
      throw new ValidationError(`Malformed path: ${raw}`);
    }
    return new MaterializedPath(raw);
  }

  /** The path of a child folder with the given id. */
  append(id: string): MaterializedPath {
    if (id.includes('/')) {
      throw new ValidationError(`Path segment cannot contain a slash: ${id}`);
    }
    if (this.depth + 1 > MaterializedPath.MAX_DEPTH) {
      throw new ValidationError(
        `Nesting deeper than ${MaterializedPath.MAX_DEPTH} levels is not allowed`,
      );
    }
    return new MaterializedPath(`${this.value}${id}/`);
  }

  get segments(): string[] {
    return this.value.split('/').filter(Boolean);
  }

  get depth(): number {
    return this.segments.length;
  }

  isRoot(): boolean {
    return this.value === '/';
  }

  /** The id of the folder this path points at, or null at the root. */
  get leafId(): string | null {
    return this.segments.at(-1) ?? null;
  }

  parent(): MaterializedPath {
    if (this.isRoot()) return this;
    const segments = this.segments.slice(0, -1);
    return new MaterializedPath(segments.length ? `/${segments.join('/')}/` : '/');
  }

  /** True when `other` is this path or lies beneath it. */
  contains(other: MaterializedPath): boolean {
    return other.value.startsWith(this.value);
  }

  /** True when `other` lies strictly beneath this path. */
  strictlyContains(other: MaterializedPath): boolean {
    return this.contains(other) && !this.equals(other);
  }

  /**
   * SQL LIKE pattern for this path and everything beneath it. Segments are
   * uuids, so no LIKE metacharacter can appear and no escaping is needed.
   */
  toSubtreePattern(): string {
    return `${this.value}%`;
  }

  /** This path with `from` swapped for `to` — how a move rewrites descendants. */
  reparent(from: MaterializedPath, to: MaterializedPath): MaterializedPath {
    if (!from.contains(this)) {
      throw new ValidationError(`${this.value} does not lie beneath ${from.value}`);
    }
    return new MaterializedPath(to.value + this.value.slice(from.value.length));
  }

  equals(other: MaterializedPath): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
