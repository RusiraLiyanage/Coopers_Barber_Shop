import { ConfigService } from '@nestjs/config';
import { ensureNodeCryptoGlobal, loadAppEnvFile } from '@coopers/common';
import { createDatabaseConfig } from '@coopers/database';
import { DataSource, type DataSourceOptions } from 'typeorm';

loadAppEnvFile();
ensureNodeCryptoGlobal();

function createSchemaBootstrapOptions(): DataSourceOptions {
  const config = new ConfigService(process.env);
  const databaseConfig = createDatabaseConfig(config);
  const { autoLoadEntities, ...dataSourceOptions } =
    databaseConfig as DataSourceOptions & {
      autoLoadEntities?: boolean;
    };

  void autoLoadEntities;

  return {
    ...dataSourceOptions,
    synchronize: true,
  };
}

async function bootstrapSchema(): Promise<void> {
  const dataSource = new DataSource(createSchemaBootstrapOptions());

  try {
    console.info('Connecting to database for schema bootstrap...');
    await dataSource.initialize();
    console.info('Schema bootstrap completed successfully.');
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void bootstrapSchema().catch((error: unknown) => {
  console.error('Schema bootstrap failed.', error);
  process.exitCode = 1;
});
