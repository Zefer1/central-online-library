const memoryCache = new Map();
let redisClient;
let redisReady = false;
let redisTried = false;

async function getRedis() {
  if (redisReady) return redisClient;
  if (redisTried) return null;
  redisTried = true;
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;
  try {
    const mod = await import('redis');
    const { createClient } = mod;
    const client = createClient({ url: redisUrl });
    client.on('error', (err) => {
      console.warn('[cache] Redis error, falling back to memory:', err?.message || err);
    });
    await client.connect();
    redisClient = client;
    redisReady = true;
    console.log('[cache] Redis connected');
    return redisClient;
  } catch (err) {
    console.warn('[cache] Redis unavailable, using in-memory cache:', err?.message || err);
    return null;
  }
}

export async function cacheGet(key) {
  const client = await getRedis();
  if (client) {
    const raw = await client.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_e) {
      return null;
    }
  }
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expires <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

export async function cacheSet(key, value, ttlSeconds = 30) {
  const client = await getRedis();
  if (client) {
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    return;
  }
  const expires = Date.now() + ttlSeconds * 1000;
  memoryCache.set(key, { value, expires });
}

export async function cacheDel(key) {
  const client = await getRedis();
  if (client) {
    await client.del(key);
    return;
  }
  memoryCache.delete(key);
}

export async function cacheClear() {
  memoryCache.clear();
  const client = await getRedis();
  if (client) {
    try {
      await client.flushDb();
    } catch (_err) {
      // ignore flush failures in tests
    }
  }
}
