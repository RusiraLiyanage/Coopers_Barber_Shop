/// <reference types="jest" />

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadAppEnvFile } from './load-app-env';

describe('loadAppEnvFile', () => {
  const originalEnv = process.env;
  const tempDir = join(process.cwd(), '.tmp-env-loader-test');

  beforeEach(() => {
    process.env = {};
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(tempDir, { force: true, recursive: true });
  });

  it('loads .env.develop when ENV is not already set', () => {
    writeFileSync(
      join(tempDir, '.env.develop'),
      [
        'ENV=develop',
        'API_PORT=7310 # inline comment',
        'EMAIL_FROM=Cooper Mail <hello@example.com>',
      ].join('\n'),
    );

    loadAppEnvFile(tempDir);

    expect(process.env.ENV).toBe('develop');
    expect(process.env.API_PORT).toBe('7310');
    expect(process.env.EMAIL_FROM).toBe('Cooper Mail <hello@example.com>');
  });

  it('does not override existing environment values', () => {
    process.env.API_PORT = '9000';
    writeFileSync(join(tempDir, '.env.develop'), 'API_PORT=7310');

    loadAppEnvFile(tempDir);

    expect(process.env.API_PORT).toBe('9000');
  });

  it('loads the env file selected by ENV', () => {
    process.env.ENV = 'staging';
    writeFileSync(join(tempDir, '.env.staging'), 'API_PORT=8000');

    loadAppEnvFile(tempDir);

    expect(process.env.API_PORT).toBe('8000');
  });
});
