import { Worker } from 'bullmq'
import { processarMensagemWhatsapp } from './whatsapp.service.js'

export function startProcessor() {
  console.log('[Processor] BullMQ worker iniciado, aguardando jobs...')
  new Worker(
    'mensagem-whatsaap',
    async (job) => {
      console.log(
        `[Processor] Processando job #${job.id} de ${job.data.grupoNome} (${job.data.grupoWappId})`,
      )
      const dados = {
        ...job.data,
        imagemBuffer: job.data.imagemBuffer
          ? Buffer.from(job.data.imagemBuffer, 'base64')
          : null,
        dataMensagem: new Date(job.data.dataMensagem),
      }
      await processarMensagemWhatsapp(dados)
      console.log(`[Processor] Job #${job.id} concluído.`)
    },
    {
      connection: { url: process.env.REDIS_URL! },
      skipVersionCheck: true,
      concurrency: 3,
    },
  )
}
