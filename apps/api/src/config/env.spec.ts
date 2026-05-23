import { loadEnv, resetEnvCacheForTests } from './env';

describe('loadEnv', () => {
  beforeEach(() => resetEnvCacheForTests());

  it('throws when required vars are missing', () => {
    expect(() => loadEnv({} as NodeJS.ProcessEnv)).toThrow(/Invalid environment configuration/);
  });

  it('returns parsed env when valid', () => {
    const env = loadEnv({
      NODE_ENV: 'test',
      API_PORT: '4000',
      API_BASE_URL: 'http://localhost:4000',
      WEB_ORIGIN: 'http://localhost:5173',
      DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
      REDIS_URL: 'redis://localhost:6379',
      JWT_ACCESS_SECRET: 'x'.repeat(32),
      JWT_REFRESH_SECRET: 'y'.repeat(32),
      STORAGE_PUBLIC_URL: 'http://localhost:4000/files',
    } as NodeJS.ProcessEnv);
    expect(env.API_PORT).toBe(4000);
    expect(env.STORAGE_DRIVER).toBe('local');
  });
});
