import { normalizeRedisUrl } from './redis-url.js'
export const queueRedisUrl = normalizeRedisUrl(
  process.env.QUEUE_REDIS_URL ??
    process.env.REDIS_URL ??
    'redis://localhost:6379',
)
