export function isEnvAdminEnabled({ nodeEnv, enableEnvAdminFlag, username, password }) {
  const env = (nodeEnv || '').toLowerCase();
  const enabledByFlag = (enableEnvAdminFlag || '').toLowerCase() === 'true';

  // In production, env-admin login is disabled unless explicitly enabled.
  const enabled = env !== 'production' || enabledByFlag;
  if (!enabled) return false;

  return Boolean((username || '').trim()) && Boolean((password || '').trim());
}
