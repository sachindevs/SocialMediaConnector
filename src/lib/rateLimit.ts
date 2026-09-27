import redis from '@/lib/redis';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowSeconds;
  const redisKey = `rl:${key}`;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(redisKey, '-inf', windowStart);
  pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
  pipeline.zcard(redisKey);
  pipeline.expire(redisKey, windowSeconds);

  const results = await pipeline.exec();
  const count = (results?.[2]?.[1] as number) || 0;
  const resetAt = now + windowSeconds;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt,
  };
}
