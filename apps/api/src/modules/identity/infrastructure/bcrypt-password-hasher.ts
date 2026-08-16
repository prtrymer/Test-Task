import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { PasswordHasherPort } from '../application/ports/password-hasher.port';

@Injectable()
export class BcryptPasswordHasher extends PasswordHasherPort {
  private static readonly ROUNDS = 12;

  hash(plaintext: string): Promise<string> {
    return hash(plaintext, BcryptPasswordHasher.ROUNDS);
  }

  verify(plaintext: string, digest: string): Promise<boolean> {
    return compare(plaintext, digest);
  }
}
