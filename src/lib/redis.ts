import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

declare global {
  // eslint-disable-next-line no-var
  var redisClient: IORedis | undefined;
}

function createRedisClient(): IORedis {
  const client = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  client.on('error', (err) => {
    console.error('[Redis] Connection error:', err);
  });

  return client;
}

const redis: IORedis = global.redisClient ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') {
  global.redisClient = redis;
}

export default redis;
