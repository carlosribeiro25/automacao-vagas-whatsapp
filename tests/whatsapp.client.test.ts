import path from 'path'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const existsSync = vi.fn()
  const unlinkSync = vi.fn()
  const Client = vi.fn(function Client(this: { options: unknown }, options) {
    this.options = options
  })
  const LocalAuth = vi.fn(function LocalAuth(
    this: { options: unknown },
    options,
  ) {
    this.options = options
  })

  return {
    existsSync,
    unlinkSync,
    Client,
    LocalAuth,
  }
})

vi.mock('fs', () => ({
  default: {
    existsSync: mocks.existsSync,
    unlinkSync: mocks.unlinkSync,
  },
}))

vi.mock('whatsapp-web.js', () => ({
  default: {
    Client: mocks.Client,
    LocalAuth: mocks.LocalAuth,
  },
}))

describe('whatsapp.client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('getWhatsappLockfilePath monta o caminho esperado', async () => {
    const { getWhatsappLockfilePath } = await import('../src/modules/whatsapp/whatsapp.client')

    const result = getWhatsappLockfilePath('client-123')

    expect(result).toBe(
      path.resolve('.wwebjs_auth', 'session-client-123', 'lockfile'),
    )
  })

  test('cleanupWhatsappClientAuth remove o lockfile quando ele existe', async () => {
    const { cleanupWhatsappClientAuth } = await import('../src/modules/whatsapp/whatsapp.client')
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    mocks.existsSync.mockReturnValue(true)

    cleanupWhatsappClientAuth('client-abc')

    expect(mocks.existsSync).toHaveBeenCalledTimes(1)
    expect(mocks.unlinkSync).toHaveBeenCalledWith(
      path.resolve('.wwebjs_auth', 'session-client-abc', 'lockfile'),
    )
    expect(logSpy).toHaveBeenCalledWith('[WhatsApp] lockfile removido.')
  })

  test('cleanupWhatsappClientAuth ignora quando o lockfile não existe', async () => {
    const { cleanupWhatsappClientAuth } = await import('../src/modules/whatsapp/whatsapp.client')
    mocks.existsSync.mockReturnValue(false)

    cleanupWhatsappClientAuth('client-no-lock')

    expect(mocks.unlinkSync).not.toHaveBeenCalled()
  })

  test('cleanupWhatsappClientAuth avisa quando falha em todas as tentativas', async () => {
    const { cleanupWhatsappClientAuth } = await import('../src/modules/whatsapp/whatsapp.client')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const waitSpy = vi.spyOn(Atomics, 'wait').mockReturnValue('ok')

    mocks.existsSync.mockReturnValue(true)
    mocks.unlinkSync.mockImplementation(() => {
      throw new Error('busy')
    })

    cleanupWhatsappClientAuth('client-busy')

    expect(mocks.unlinkSync).toHaveBeenCalledTimes(5)
    expect(waitSpy).toHaveBeenCalledTimes(4)
    expect(warnSpy).toHaveBeenCalledWith(
      '[WhatsApp] Não foi possível remover o lockfile, ignorando.',
    )
  })

  test('createWhatsappClient cria Client com LocalAuth e puppeteer headless', async () => {
    const { createWhatsappClient } = await import('../src/modules/whatsapp/whatsapp.client')

    const client = createWhatsappClient('client-xyz')

    expect(mocks.LocalAuth).toHaveBeenCalledWith({ clientId: 'client-xyz' })
    expect(mocks.Client).toHaveBeenCalledWith({
      authStrategy: { options: { clientId: 'client-xyz' } },
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    })
    expect(client).toEqual({
      options: {
        authStrategy: { options: { clientId: 'client-xyz' } },
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
    })
  })
})
