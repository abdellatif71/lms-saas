import { describe, expect, it } from 'vitest';

export {};

Reflect.set(process.env, 'NODE_ENV', 'test');

const { env } = await import('../env');

describe('environment loader', () => {
  it('uses the default log level', () => {
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('exposes DATABASE_URL as a string', () => {
    expect(typeof env.DATABASE_URL).toBe('string');
  });
});
