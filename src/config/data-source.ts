import { DataSource } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

/**
 * Standalone DataSource for the TypeORM CLI (migrations).
 * The runtime connection is configured in app.module.ts via TypeOrmModule.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'wauser',
  password: process.env.DB_PASSWORD || 'wapassword',
  database: process.env.DB_NAME || 'wa_automation',
  entities: ['src/**/*.entity.ts'],
  migrations: ['migrations/*.ts'],
  synchronize: false,
});
