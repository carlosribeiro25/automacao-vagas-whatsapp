import { Redis } from 'ioredis';
import { normalizeRedisUrl } from './redis-url.js';
export const redisConnection = new Redis(normalizeRedisUrl(process.env.AUTH_REDIS_URL ??
    process.env.REDIS_URL ??
    'redis://localhost:6379'));
