import { Worker } from "bullmq";
import { processarMensagemWhatsapp } from "./whatsapp.service.js";

export function startProcessor() {
    new Worker('mensagem-whatsaap', async (job) => {
        const dados = {
            ...job.data,
            imagemBuffer: job.data.imagemBuffer
             ? Buffer.from(job.data.imagemBuffer, 'base64')
             : null,
             dataMensagem: new Date(job.data.dataMensagem),
        }
        await processarMensagemWhatsapp(dados)
    }, {
        connection: { url: process.env.REDIS_URL! },
        skipVersionCheck: true,
        concurrency: 3,
    })
}