import { registerAs } from '@nestjs/config';

export default registerAs('openwa', () => ({
  baseUrl: process.env.OPENWA_BASE_URL || 'https://openwa.fts-tech.co.id',
  masterKey: process.env.OPENWA_MASTER_KEY || '',
}));
