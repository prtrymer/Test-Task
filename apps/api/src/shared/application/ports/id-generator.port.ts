export abstract class IdGeneratorPort {
  abstract generate(): string;

  abstract generateToken(): string;
}
