import fs from 'fs'
import path from 'path'
import pkg from 'whatsapp-web.js'

const { Client, LocalAuth } = pkg

export type WhatsappClient = InstanceType<typeof Client>

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

export function getWhatsappLockfilePath(clientKey: string) {
  return path.resolve('.wwebjs_auth', `session-${clientKey}`, 'lockfile')
}

export function cleanupWhatsappClientAuth(clientKey: string) {
  removeLockfileWithRetry(getWhatsappLockfilePath(clientKey))
}

export function createWhatsappClient(clientKey: string): WhatsappClient {
  return new Client({
    authStrategy: new LocalAuth({ clientId: clientKey }),
    puppeteer: {
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      protocolTimeout: 300_000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--js-flags=--max-old-space-size=256',
      ],
    },
  }) as WhatsappClient
}
