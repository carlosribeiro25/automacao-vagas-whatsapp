import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { db } from '../src/db'
import { makeUser } from '../src/factore/make-user'
import { whatsapp_connections } from '../src/db/schema'
import { eq } from 'drizzle-orm'

const mocks = vi.hoisted(() => {
  const cleanupWhatsappClientAuth = vi.fn()
  const createWhatsappClient = vi.fn()
  const emitWhatsappRuntimeEvent = vi.fn()
  const bindWhatsappMessageHandlers = vi.fn()

  class MockWhatsappClient {
    listeners = new Map<string, Array<(...args: unknown[]) => unknown>>()
    initialize = vi.fn()
    destroy = vi.fn().mockResolvedValue(undefined)

    on(event: string, listener: (...args: unknown[]) => unknown) {
      const current = this.listeners.get(event) ?? []
      current.push(listener)
      this.listeners.set(event, current)
    }

    async emitAsync(event: string, ...args: unknown[]) {
      const listeners = this.listeners.get(event) ?? []
      for (const listener of listeners) {
        await listener(...args)
      }
    }
  }

  return {
    cleanupWhatsappClientAuth,
    createWhatsappClient,
    emitWhatsappRuntimeEvent,
    bindWhatsappMessageHandlers,
    MockWhatsappClient,
  }
})

vi.mock('../src/modules/whatsapp/whatsapp.client', () => ({
  cleanupWhatsappClientAuth: mocks.cleanupWhatsappClientAuth,
  createWhatsappClient: mocks.createWhatsappClient,
}))

vi.mock('../src/modules/whatsapp/whatsapp.events', () => ({
  emitWhatsappRuntimeEvent: mocks.emitWhatsappRuntimeEvent,
}))

vi.mock('../src/modules/whatsapp/whatsaap.worker', () => ({
  bindWhatsappMessageHandlers: mocks.bindWhatsappMessageHandlers,
}))

async function loadManager() {
  vi.resetModules()
  return import('../src/modules/whatsapp/whatsapp.connection-manager')
}

async function createConnection(
  overrides?: Partial<typeof whatsapp_connections.$inferInsert>,
) {
  const { user } = await makeUser('user')

  const [connection] = await db
    .insert(whatsapp_connections)
    .values({
      userId: user.id,
      status: 'pending',
      phone: null,
      clientKey: `wa-test-${crypto.randomUUID()}`,
      ...overrides,
    })
    .returning()

  return connection
}

describe('whatsappConnectionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('ensureRuntime cria runtime e reutiliza a mesma instancia', async () => {
    const connection = await createConnection()
    const client = new mocks.MockWhatsappClient()
    mocks.createWhatsappClient.mockReturnValue(client)

    const { whatsappConnectionManager } = await loadManager()

    const runtime = await whatsappConnectionManager.ensureRuntime(connection.id)
    const cachedRuntime = await whatsappConnectionManager.ensureRuntime(
      connection.id,
    )

    expect(runtime).toEqual({
      client,
      initialized: false,
    })
    expect(cachedRuntime).toBe(runtime)
    expect(mocks.createWhatsappClient).toHaveBeenCalledTimes(1)
    expect(mocks.createWhatsappClient).toHaveBeenCalledWith(
      connection.clientKey,
    )
    expect(mocks.bindWhatsappMessageHandlers).toHaveBeenCalledWith(
      client,
      connection.id,
    )
    expect(whatsappConnectionManager.getClient(connection.id)).toBe(client)
  })

  test('startConnection inicializa apenas uma vez e atualiza status pendente', async () => {
    const connection = await createConnection({
      status: 'disconnected',
      disconnectedAt: new Date(),
    })
    const client = new mocks.MockWhatsappClient()
    mocks.createWhatsappClient.mockReturnValue(client)

    const { whatsappConnectionManager } = await loadManager()

    await whatsappConnectionManager.startConnection(connection.id)
    await whatsappConnectionManager.startConnection(connection.id)

    expect(client.initialize).toHaveBeenCalledTimes(1)

    const updated = await db
      .select()
      .from(whatsapp_connections)
      .where(eq(whatsapp_connections.id, connection.id))
      .then((rows) => rows[0])

    expect(updated.status).toBe('pending')
    expect(updated.disconnectedAt).toBeNull()
  })

  test('evento qr atualiza banco e emite evento de runtime', async () => {
    const connection = await createConnection()
    const client = new mocks.MockWhatsappClient()
    mocks.createWhatsappClient.mockReturnValue(client)

    const { whatsappConnectionManager } = await loadManager()
    await whatsappConnectionManager.ensureRuntime(connection.id)

    await client.emitAsync('qr', 'qr-code-123')

    const updated = await db
      .select()
      .from(whatsapp_connections)
      .where(eq(whatsapp_connections.id, connection.id))
      .then((rows) => rows[0])

    expect(updated.status).toBe('qr_ready')
    expect(updated.lastQr).toBe('qr-code-123')
    expect(updated.lastQrAt).toBeTruthy()
    expect(mocks.emitWhatsappRuntimeEvent).toHaveBeenCalledWith(connection.id, {
      type: 'qr',
      payload: { status: 'qr_ready', qr: 'qr-code-123' },
    })
  })

  test('eventos authenticated, ready e auth_failure atualizam status corretamente', async () => {
    const connection = await createConnection()
    const client = new mocks.MockWhatsappClient()
    mocks.createWhatsappClient.mockReturnValue(client)

    const { whatsappConnectionManager } = await loadManager()
    await whatsappConnectionManager.ensureRuntime(connection.id)

    await client.emitAsync('authenticated')
    let updated = await db
      .select()
      .from(whatsapp_connections)
      .where(eq(whatsapp_connections.id, connection.id))
      .then((rows) => rows[0])

    expect(updated.status).toBe('authenticated')
    expect(mocks.emitWhatsappRuntimeEvent).toHaveBeenCalledWith(connection.id, {
      type: 'status',
      payload: { status: 'authenticated' },
    })

    await client.emitAsync('ready')
    updated = await db
      .select()
      .from(whatsapp_connections)
      .where(eq(whatsapp_connections.id, connection.id))
      .then((rows) => rows[0])

    expect(updated.status).toBe('ready')
    expect(updated.connectedAt).toBeTruthy()
    expect(mocks.emitWhatsappRuntimeEvent).toHaveBeenCalledWith(connection.id, {
      type: 'status',
      payload: { status: 'ready' },
    })

    await client.emitAsync('auth_failure', 'falha-auth')
    updated = await db
      .select()
      .from(whatsapp_connections)
      .where(eq(whatsapp_connections.id, connection.id))
      .then((rows) => rows[0])

    expect(updated.status).toBe('failed')
    expect(mocks.emitWhatsappRuntimeEvent).toHaveBeenCalledWith(connection.id, {
      type: 'error',
      payload: { status: 'failed', message: 'falha-auth' },
    })
  })

  test('evento disconnected limpa runtime, auth local e emite status', async () => {
    const connection = await createConnection({ status: 'ready' })
    const client = new mocks.MockWhatsappClient()
    mocks.createWhatsappClient.mockReturnValue(client)

    const { whatsappConnectionManager } = await loadManager()
    await whatsappConnectionManager.ensureRuntime(connection.id)

    await client.emitAsync('disconnected', 'logout')

    const updated = await db
      .select()
      .from(whatsapp_connections)
      .where(eq(whatsapp_connections.id, connection.id))
      .then((rows) => rows[0])

    expect(updated.status).toBe('disconnected')
    expect(updated.disconnectedAt).toBeTruthy()
    expect(whatsappConnectionManager.getClient(connection.id)).toBeNull()
    expect(mocks.cleanupWhatsappClientAuth).toHaveBeenCalledWith(
      connection.clientKey,
    )
    expect(mocks.emitWhatsappRuntimeEvent).toHaveBeenCalledWith(connection.id, {
      type: 'status',
      payload: { status: 'disconnected', reason: 'logout' },
    })
  })

  test('disconnectConnection destroi client, atualiza banco e emite evento', async () => {
    const connection = await createConnection({ status: 'ready' })
    const client = new mocks.MockWhatsappClient()
    mocks.createWhatsappClient.mockReturnValue(client)

    const { whatsappConnectionManager } = await loadManager()
    await whatsappConnectionManager.ensureRuntime(connection.id)

    await whatsappConnectionManager.disconnectConnection(connection.id)

    const updated = await db
      .select()
      .from(whatsapp_connections)
      .where(eq(whatsapp_connections.id, connection.id))
      .then((rows) => rows[0])

    expect(client.destroy).toHaveBeenCalledTimes(1)
    expect(updated.status).toBe('disconnected')
    expect(updated.disconnectedAt).toBeTruthy()
    expect(whatsappConnectionManager.getClient(connection.id)).toBeNull()
    expect(mocks.cleanupWhatsappClientAuth).toHaveBeenCalledWith(
      connection.clientKey,
    )
    expect(mocks.emitWhatsappRuntimeEvent).toHaveBeenCalledWith(connection.id, {
      type: 'status',
      payload: { status: 'disconnected' },
    })
  })
})
