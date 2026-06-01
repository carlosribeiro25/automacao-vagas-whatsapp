import { Queue } from "bullmq";

export const mensagemQueue = new Queue('mensagem-whatsaap', {
    connection: { url: process.env.REDIS_URL! },
    skipVersionCheck: true,
    defaultJobOptions:{
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000},
    }
})