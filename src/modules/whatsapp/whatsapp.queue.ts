import { Queue } from 'bullmq'
import { queueRedisUrl } from '../../lib/queue-redis.js'

export type WhatsappMessageJobData = {
  connectionId: number
  grupoWappId: string
  grupoNome: string
  autor: string
  conteudo: string
  imagemBuffer: string | null
  imagemNome: string | null
  dataMensagem: Date
}

export const mensagemQueue = new Queue<WhatsappMessageJobData>(
  'mensagem-whatsaap',
  {
    connection: { url: queueRedisUrl },
    skipVersionCheck: true,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    },
  },
)
