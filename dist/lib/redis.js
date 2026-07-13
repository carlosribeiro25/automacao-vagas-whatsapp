import { Redis } from 'ioredis'
import { normalizeRedisUrl } from './redis-url.js'
export const redisConnection = new Redis(
  normalizeRedisUrl(
    process.env.AUTH_REDIS_URL ??
      process.env.REDIS_URL ??
      'redis://localhost:6379',
  ),
  {
    connectTimeout: 5000,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy(times) {
      if (times > 5) {
        return null
      }
      return Math.min(times * 200, 2000)
    },
  },
)
