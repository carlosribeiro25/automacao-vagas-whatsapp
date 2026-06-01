import { whatsappClient } from './whatsapp.client.js'
import { processarMensagemWhatsapp } from './whatsapp.service.js'
import type pkg from 'whatsapp-web.js'
import { mensagemQueue } from './whatsapp.queue.js'

export function startWhatsappWorker() {
  const handler = async (msg: pkg.Message) => {
    console.log('[Worker] Mensagem recebida de:', msg.from)
    try {
      const isGrupo = msg.from.endsWith('@g.us')
      const isCanal = msg.from.endsWith('@newsletter')
      if (!isGrupo && !isCanal) return

      const chat = await msg.getChat()
      const grupoNome = chat.name

      let imagemBuffer: Buffer | null = null
      let imagemNome: string | null = null

      if (msg.hasMedia) {
        const midia = await msg.downloadMedia()
        if (midia?.data) {
          imagemBuffer = Buffer.from(midia.data, 'base64')
          const extrair = midia.mimetype.split('/')[1]?.split(';')[0] ?? 'jpg'
          imagemNome = `${msg.id._serialized}.${extrair}`
        }
      }
      await mensagemQueue.add('processar',{
        grupoWappId: msg.from,
        grupoNome,
        autor: msg.author ?? msg.from,
        conteudo: msg.body,
        imagemBuffer: imagemBuffer?.toString('base64') ?? null,
        imagemNome,
        dataMensagem: new Date(msg.timestamp * 1000),
      })
    } catch (error) {
      console.error(
        '[Worker] Erro ao processar mensagem:',
        JSON.stringify(error, null, 2),
        error,
      )
    }
  }

  whatsappClient.on('message', handler)

  whatsappClient.initialize()
  console.log('[Worker] WhatsApp worker iniciado.')
}
