import { Worker } from "bullmq";
import { processarMensagemWhatsapp } from "./whatsaap.service.js";

export function startProcessor() {
    new Worker('mensagem-whatsaap', async (job) => {
        const dadaos = {
            ...job.data,
            imagemBuffer: job.data.imagemBuffer
             ? Buffer.from(job.data.imagemBuffer, 'base64')
             : null,
             dataMensagem: new Date(job.data.dataMensagem),
        }
        await processarMensagemWhatsapp(dadaos)
    }, {
        connection: { url: process.env.REDIS_URL! },
        skipVersionCheck: true,
        concurrency: 3,
    })
}