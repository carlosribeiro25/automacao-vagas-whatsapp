// 
// src/modules/whatsaap/whatsapp.client.ts
// Inicializa e autentica o cliente WhatsApp, exibindo o QR code no terminal.
import fs from 'fs'
import path from 'path'
import qrcode from 'qrcode-terminal'
import pkg from 'whatsapp-web.js'
const { Client, LocalAuth } = pkg

function removeLockfileWithRetry(lockfilePath: string, retries = 5, delay = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      if (fs.existsSync(lockfilePath)) {
        fs.unlinkSync(lockfilePath)
        console.log('[WhatsApp] lockfile removido.')
      }
      return
    } catch {
      if (i < retries - 1) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay)
      } else {
        console.warn('[WhatsApp] Não foi possível remover o lockfile, ignorando.')
      }
    }
  }
}

export const whatsappClient = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
})

whatsappClient.on('qr', (qr) => {
  console.log('[WhatsApp] Escaneie o QR Code abaixo:')
  qrcode.generate(qr, { small: true })
})

whatsappClient.on('ready', () => {
  console.log('[WhatsApp] Cliente conectado e pronto!')
})

whatsappClient.on('auth_failure', (msg) => {
  console.error('[WhatsApp] Falha na autenticação:', msg)
})

whatsappClient.on('disconnected', (reason) => {
  console.warn('[WhatsApp] Desconectado:', reason)
  const lockfile = path.resolve('.wwebjs_auth', 'session', 'lockfile')
  removeLockfileWithRetry(lockfile)
})



// Passo 4 — Conectar no server.ts
// Adicione as duas linhas para inicializar o worker junto com o servidor:

// import { startWhatsappWorker } from './modules/whatsaap/whatsapp.worker.js'

// // antes do server.listen(...)
// startWhatsappWorker()


// Depois de criar os arquivos, rode npm run dev — o QR code vai aparecer no terminal para autenticar.