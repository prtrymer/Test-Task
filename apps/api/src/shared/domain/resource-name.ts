import { ValidationError } from './domain-error';

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

  get stem(): string {
    const dot = this.value.lastIndexOf('.');
    return dot > 0 ? this.value.slice(0, dot) : this.value;
  }

  get extension(): string {
    const dot = this.value.lastIndexOf('.');
    return dot > 0 ? this.value.slice(dot) : '';
  }

  withSuffix(n: number): ResourceName {
    return ResourceName.create(`${this.stem} (${n})${this.extension}`);
  }

  equals(other: ResourceName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
