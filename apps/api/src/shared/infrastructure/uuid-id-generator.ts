import { Injectable } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { IdGeneratorPort } from '../application/ports/id-generator.port';

@Injectable()
export class UuidIdGenerator extends IdGeneratorPort {
  generate(): string {
    return randomUUID();
  }

  /** 256 bits, url-safe. A share link's only protection is being unguessable. */
  generateToken(): string {
    return randomBytes(32).toString('base64url');
  }
}
