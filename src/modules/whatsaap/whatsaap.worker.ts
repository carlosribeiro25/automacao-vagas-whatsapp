import { whatsappClient } from "./whatsaap.client.js";
import { processarMensagemWhatsapp } from "./whatsaap.service.js";
import type pkg from 'whatsapp-web.js'

export function startWhatsappWorker() {
    whatsappClient.on('message', async (msg: pkg.Message) => {
        try {
            if(!msg.from.endsWith('@gc.us')) return

            const chat = await msg.getChat()
            const grupoNome = chat.name

            let imagemBuffer: Buffer | null = null
            let imagemNome: string | null = null

            if(msg.hasMedia) {
                const midia = await msg.downloadMedia()
                if(midia?.data) {
                    imagemBuffer = Buffer.from(midia.data, 'base64')
                    const extrair = midia.mimetype.split('/')[1]?.split(';')[0] ?? 'jpg'
                    imagemNome = `${msg.id._serialized}.${extrair}`
                }
            }
            await processarMensagemWhatsapp({
                grupoWppId: msg.from,
                grupoNome,
                autor: msg.author ?? msg.from,
                conteudo: msg.body,
                imagemBuffer,
                imagemNome,
                dataMensagem: new Date(msg.timestamp * 1000)
            })
        } catch (error) {
            console.error('[Worker] Erro ao processar mensagem:', error)
        }
    })

    whatsappClient.initialize()
    console.log('[Worker] WhatsApp worker iniciado.')
}