import { describe, it, expect } from 'vitest';
import { isEnvAdminEnabled } from '../authConfig.js';

describe('authConfig', () => {
  it('enables env-admin in non-production when creds exist', () => {
    expect(
      isEnvAdminEnabled({
        nodeEnv: 'test',
        enableEnvAdminFlag: 'false',
        username: 'admin',
        password: 'admin',
      }),
    ).toBe(true);
  });

  it('disables env-admin in production unless ENABLE_ENV_ADMIN=true', () => {
    expect(
      isEnvAdminEnabled({
        nodeEnv: 'production',
        enableEnvAdminFlag: 'false',
        username: 'admin',
        password: 'admin',
      }),
    ).toBe(false);

    expect(
      isEnvAdminEnabled({
        nodeEnv: 'production',
        enableEnvAdminFlag: 'true',
        username: 'admin',
        password: 'admin',
      }),
    ).toBe(true);
  });

  it('requires username+password even if enabled', () => {
    expect(
      isEnvAdminEnabled({
        nodeEnv: 'production',
        enableEnvAdminFlag: 'true',
        username: '',
        password: 'x',
      }),
    ).toBe(false);
  });
});
