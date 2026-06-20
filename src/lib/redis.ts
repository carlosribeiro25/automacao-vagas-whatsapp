import { Redis } from 'ioredis'

export const redisConnection = new Redis(
  process.env.AUTH_REDIS_URL ?? process.env.REDIS_URL ?? 'redis://localhost:6379',
)
