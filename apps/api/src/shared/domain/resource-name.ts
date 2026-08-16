import { ValidationError } from './domain-error';

/** A user-supplied folder or file name. */
export class ResourceName {
  static readonly MAX_LENGTH = 255;

  private constructor(readonly value: string) {}

  static create(raw: string): ResourceName {
    const trimmed = (raw ?? '').trim();

    if (!trimmed) {
      throw new ValidationError('Name cannot be empty');
    }
    if (trimmed.length > ResourceName.MAX_LENGTH) {
      throw new ValidationError(
        `Name cannot exceed ${ResourceName.MAX_LENGTH} characters`,
      );
    }
    if (trimmed.includes('/') || trimmed.includes('\\')) {
      throw new ValidationError('Name cannot contain slashes');
    }
    if (/[\x00-\x1f\x7f]/.test(trimmed)) {
      throw new ValidationError('Name cannot contain control characters');
    }
    if (trimmed === '.' || trimmed === '..') {
      throw new ValidationError(`"${trimmed}" is not a valid name`);
    }

    return new ResourceName(trimmed);
  }

  /**
   * `report.pdf` → `report (2).pdf`. Used when resolving a rename collision;
   * uploads take the versioning path instead.
   */
  withSuffix(n: number): ResourceName {
    const dot = this.value.lastIndexOf('.');
    const hasExtension = dot > 0;
    const stem = hasExtension ? this.value.slice(0, dot) : this.value;
    const extension = hasExtension ? this.value.slice(dot) : '';
    return ResourceName.create(`${stem} (${n})${extension}`);
  }

  equals(other: ResourceName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
