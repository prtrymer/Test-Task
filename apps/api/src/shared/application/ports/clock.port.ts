/** Time as a dependency, so expiry and revocation rules are testable. */
export abstract class ClockPort {
  abstract now(): Date;
}
