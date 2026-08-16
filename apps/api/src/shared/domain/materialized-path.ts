import { ValidationError } from './domain-error';

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

  get leafId(): string | null {
    return this.segments.at(-1) ?? null;
  }

  parent(): MaterializedPath {
    if (this.isRoot()) return this;
    const segments = this.segments.slice(0, -1);
    return new MaterializedPath(segments.length ? `/${segments.join('/')}/` : '/');
  }

  contains(other: MaterializedPath): boolean {
    return other.value.startsWith(this.value);
  }

  strictlyContains(other: MaterializedPath): boolean {
    return this.contains(other) && !this.equals(other);
  }

  toSubtreePattern(): string {
    return `${this.value}%`;
  }

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
