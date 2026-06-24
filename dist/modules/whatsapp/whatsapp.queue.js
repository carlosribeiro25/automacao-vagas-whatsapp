import { Queue } from 'bullmq';
import { queueRedisUrl } from '../../lib/queue-redis.js';
export const mensagemQueue = new Queue('mensagem-whatsaap', {
    connection: { url: queueRedisUrl },
    skipVersionCheck: true,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
    },
});
