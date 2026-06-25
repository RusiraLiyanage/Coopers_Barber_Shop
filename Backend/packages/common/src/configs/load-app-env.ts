import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { APP_ENVIRONMENTS, type AppEnvironment } from './app.config';

const DEFAULT_LOCAL_ENV: AppEnvironment = 'develop';

export function loadAppEnvFile(cwd = process.cwd()): void {
  const env = resolveAppEnvironment();
  const envFilePath = resolve(cwd, `.env.${env}`);

  if (!existsSync(envFilePath)) {
    return;
  }

  const envFile = readFileSync(envFilePath, 'utf8');

  for (const line of envFile.split(/\r?\n/)) {
    const parsedLine = parseEnvLine(line);

    if (!parsedLine || process.env[parsedLine.key] !== undefined) {
      continue;
    }

    process.env[parsedLine.key] = parsedLine.value;
  }
}

function resolveAppEnvironment(): AppEnvironment {
  const env = process.env.ENV?.trim() || DEFAULT_LOCAL_ENV;

  if (!APP_ENVIRONMENTS.includes(env as AppEnvironment)) {
    throw new Error(`Invalid ENV value: ${env}`);
  }

  return env as AppEnvironment;
}

function parseEnvLine(line: string): { key: string; value: string } | null {
  const trimmedLine = line.trim();

  if (!trimmedLine || trimmedLine.startsWith('#')) {
    return null;
  }

  const separatorIndex = trimmedLine.indexOf('=');

  if (separatorIndex <= 0) {
    return null;
  }

  const key = trimmedLine.slice(0, separatorIndex).trim();
  const rawValue = stripInlineComment(
    trimmedLine.slice(separatorIndex + 1).trim(),
  );

  return {
    key,
    value: unquoteValue(rawValue),
  };
}

function stripInlineComment(value: string): string {
  let quote: '"' | "'" | null = null;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if ((character === '"' || character === "'") && value[index - 1] !== '\\') {
      quote = quote === character ? null : character;
    }

    if (character === '#' && quote === null) {
      return value.slice(0, index).trim();
    }
  }

  return value;
}

function unquoteValue(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
