import { ConflictError, ValidationError } from '../../../shared/domain/domain-error';
import { MaterializedPath } from '../../../shared/domain/materialized-path';
import { ResourceName } from '../../../shared/domain/resource-name';

export interface FolderState {
  id: string;
  dataRoomId: string;
  parentId: string | null;
  name: ResourceName;
  path: MaterializedPath;
}

export class Folder {
  private constructor(private state: FolderState) {}

  static create(input: {
    id: string;
    dataRoomId: string;
    parent: Folder | null;
    name: string;
  }): Folder {
    const parentPath = input.parent ? input.parent.path : MaterializedPath.root();

    if (input.parent && input.parent.dataRoomId !== input.dataRoomId) {
      throw new ValidationError('A folder cannot be created outside its data room');
    }

    return new Folder({
      id: input.id,
      dataRoomId: input.dataRoomId,
      parentId: input.parent?.id ?? null,
      name: ResourceName.create(input.name),
      path: parentPath.append(input.id),
    });
  }

  static rehydrate(state: {
    id: string;
    dataRoomId: string;
    parentId: string | null;
    name: string;
    path: string;
  }): Folder {
    return new Folder({
      id: state.id,
      dataRoomId: state.dataRoomId,
      parentId: state.parentId,
      name: ResourceName.create(state.name),
      path: MaterializedPath.fromString(state.path),
    });
  }

  get id(): string {
    return this.state.id;
  }

  get dataRoomId(): string {
    return this.state.dataRoomId;
  }

  get parentId(): string | null {
    return this.state.parentId;
  }

  get name(): ResourceName {
    return this.state.name;
  }

  get path(): MaterializedPath {
    return this.state.path;
  }

  get depth(): number {
    return this.state.path.depth - 1;
  }

  rename(newName: string): void {
    this.state.name = ResourceName.create(newName);
  }

  moveTo(newParent: Folder | null): { from: MaterializedPath; to: MaterializedPath } {
    const newParentPath = newParent ? newParent.path : MaterializedPath.root();

    if (newParent) {
      if (newParent.dataRoomId !== this.dataRoomId) {
        throw new ValidationError('A folder cannot be moved to another data room');
      }
      if (newParent.id === this.id) {
        throw new ConflictError('A folder cannot be moved into itself');
      }
      if (this.path.contains(newParent.path)) {
        throw new ConflictError('A folder cannot be moved into its own subtree');
      }
    }

    if (this.state.parentId === (newParent?.id ?? null)) {
      throw new ConflictError('The folder is already in that location');
    }

    const from = this.state.path;
    const to = newParentPath.append(this.state.id);

    this.state.parentId = newParent?.id ?? null;
    this.state.path = to;

    return { from, to };
  }

  toSnapshot() {
    return {
      id: this.state.id,
      dataRoomId: this.state.dataRoomId,
      parentId: this.state.parentId,
      name: this.state.name.value,
      path: this.state.path.value,
      depth: this.depth,
    };
  }
}
