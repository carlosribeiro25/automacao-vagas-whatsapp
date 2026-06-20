export const queueRedisUrl =
  process.env.QUEUE_REDIS_URL ?? process.env.REDIS_URL ?? 'redis://localhost:6379'