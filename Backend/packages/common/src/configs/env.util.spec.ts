/// <reference types="jest" />

import { ConfigService } from '@nestjs/config';
import {
  getRequiredConfigInteger,
  getRequiredConfigString,
  getRequiredEnvInteger,
  parseRequiredBoolean,
} from './env.util';

describe('env util', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns required config strings', () => {
    const config = new ConfigService({ APP_NAME: ' Cooper ' });

    expect(getRequiredConfigString(config, 'APP_NAME')).toBe('Cooper');
  });

  it('throws when a required config string is missing', () => {
    const config = new ConfigService({});

    expect(() => getRequiredConfigString(config, 'APP_NAME')).toThrow(
      'Missing env variable: APP_NAME',
    );
  });

  it('returns required config integers', () => {
    const config = new ConfigService({ API_PORT: '7310' });

    expect(getRequiredConfigInteger(config, 'API_PORT')).toBe(7310);
  });

  it('throws when a required config integer is invalid', () => {
    const config = new ConfigService({ API_PORT: '0' });

    expect(() => getRequiredConfigInteger(config, 'API_PORT')).toThrow(
      'API_PORT must be a positive integer',
    );
  });

  it('returns required env integers', () => {
    process.env = { ...originalEnv, ACCESS_TOKEN_TTL_SECONDS: '120' };

    expect(getRequiredEnvInteger('ACCESS_TOKEN_TTL_SECONDS')).toBe(120);
  });

  it('parses required boolean strings', () => {
    expect(parseRequiredBoolean('true', 'SMTP_SECURE')).toBe(true);
    expect(parseRequiredBoolean('false', 'SMTP_SECURE')).toBe(false);
  });

  it('throws when a required boolean string is invalid', () => {
    expect(() => parseRequiredBoolean('yes', 'SMTP_SECURE')).toThrow(
      'SMTP_SECURE must be true or false',
    );
  });
});
