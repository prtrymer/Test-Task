export abstract class PasswordHasherPort {
  abstract hash(plaintext: string): Promise<string>;
  abstract verify(plaintext: string, hash: string): Promise<boolean>;
}
