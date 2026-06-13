import { ConfigModuleOptions } from '@nestjs/config';

export const APP_ENVIRONMENTS = ['develop', 'staging', 'production'] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number]; // Whatever values exist inside APP_ENVIRONMENTS, use those as the allowed environment type.

const REQUIRED_ENV_KEYS = [
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_DATABASE',
  'JWT_SECRET',
  'INTERNAL_GATEWAY_SECRET',
  'API_PORT',
  'GUARD_PORT',
  'FRONTEND_URL',
  'BOOKING_API_URL',
  'AUTH_API_URL',
] as const;

export const getAppEnvironment = (): AppEnvironment => {
  const env = process.env.ENV ?? 'develop';

  if (!APP_ENVIRONMENTS.includes(env as AppEnvironment)) {
    throw new Error(`Invalid ENV value: ${env}`);
  }

  return env as AppEnvironment;
};

// will provde the data to the application
export const createAppConfigOptions = (): ConfigModuleOptions => ({
  isGlobal: true,
  envFilePath: [`.env.${getAppEnvironment()}`],
  validate: (config: { [x: string]: any }) => {
    const missingKeys = REQUIRED_ENV_KEYS.filter((key) => !config[key]);

    if (missingKeys.length > 0) {
      throw new Error(`Missing env variables: ${missingKeys.join(', ')}`);
    }

    return config;
  },
});
