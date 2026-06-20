import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

// OWASP recommends a bcrypt work factor of at least 12 for new systems. Existing
// hashes embed their own cost, so they keep verifying and only get upgraded the
// next time the user sets a password. Tunable via BCRYPT_SALT_ROUNDS, clamped to
// a sane range so a misconfiguration can't make hashing trivially weak or wedge
// the service with an absurd cost.
const DEFAULT_SALT_ROUNDS = 12;
const MIN_SALT_ROUNDS = 10;
const MAX_SALT_ROUNDS = 15;

@Injectable()
export class PasswordService {
  private readonly saltRounds: number;

  constructor(config: ConfigService) {
    const configuredRounds = Number(config.get<string>('BCRYPT_SALT_ROUNDS'));

    this.saltRounds =
      Number.isInteger(configuredRounds) &&
      configuredRounds >= MIN_SALT_ROUNDS &&
      configuredRounds <= MAX_SALT_ROUNDS
        ? configuredRounds
        : DEFAULT_SALT_ROUNDS;
  }

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  compare(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }
}
