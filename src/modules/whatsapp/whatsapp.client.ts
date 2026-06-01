import fs from 'fs'
import path from 'path'
import qrcode from 'qrcode-terminal'
import pkg from 'whatsapp-web.js'
const { Client, LocalAuth } = pkg

function removeLockfileWithRetry(
  lockfilePath: string,
  retries = 5,
  delay = 500,
) {
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
        console.warn(
          '[WhatsApp] Não foi possível remover o lockfile, ignorando.',
        )
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

whatsappClient.on('loading_screen', (percent, message) => {
  console.log(`[WhatsApp] Carregando... ${percent}% - ${message}`)
})

whatsappClient.on('authenticated', () => {
  console.log('[WhatsApp] Sessão autenticada.')
})

whatsappClient.on('ready', () => {
  console.log('[WhatsApp] Cliente conectado e pronto!')

  // Verifica se os listeners de mensagem estão funcionando
  whatsappClient.getChats().then((chats) => {
    console.log(`[WhatsApp] ${chats.length} chats carregados — listeners ativos.`)
  }).catch((err) => {
    console.error('[WhatsApp] getChats() falhou — página Puppeteer não está pronta:', err.message)
    console.warn('[WhatsApp] Reiniciando cliente para corrigir...')
    whatsappClient.destroy().then(() => {
      setTimeout(() => whatsappClient.initialize(), 3000)
    })
  })
})

// Fallback: se ready não disparar em 15s após authenticated, verifica estado e emite manualmente
let readyFired = false
whatsappClient.once('ready', () => { readyFired = true })
whatsappClient.once('authenticated', () => {
  const check = async (attempt: number) => {
    if (readyFired) return
    const state = await whatsappClient.getState().catch(() => null)
    if (state === 'CONNECTED') {
      console.log('[WhatsApp] Cliente CONNECTED — emitindo ready manualmente.')
      whatsappClient.emit('ready')
      return
    }
    if (attempt < 12) {
      setTimeout(() => check(attempt + 1), 5_000)
    } else {
      console.error('[WhatsApp] Não foi possível confirmar ready após 60s. Reiniciando...')
      whatsappClient.destroy().then(() => {
        setTimeout(() => whatsappClient.initialize(), 3000)
      })
    }
  }
  setTimeout(() => check(0), 15_000)
})

whatsappClient.on('auth_failure', (msg) => {
  console.error('[WhatsApp] Falha na autenticação:', msg)
})

whatsappClient.on('disconnected', (reason) => {
  console.warn('[WhatsApp] Desconectado:', reason)
  const lockfile = path.resolve('.wwebjs_auth', 'session', 'lockfile')
  removeLockfileWithRetry(lockfile)
})
