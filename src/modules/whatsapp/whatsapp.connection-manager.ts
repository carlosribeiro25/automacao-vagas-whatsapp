import { db } from '@/db/index.js'
import { whatsapp_connections } from '@/db/schema.js'
import { eq } from 'drizzle-orm'
import {
  cleanupWhatsappClientAuth,
  createWhatsappClient,
  type WhatsappClient,
} from './whatsapp.client.js'
import { emitWhatsappRuntimeEvent } from './whatsapp.events.js'
import { bindWhatsappMessageHandlers } from './whatsaap.worker.js'

type RuntimeEntry = {
  client: WhatsappClient
  initialized: boolean
}

class WhatsappConnectionManager {
  private runtimes = new Map<number, RuntimeEntry>()

  private async getConnection(connectionId: number) {
    const connection = await db
      .select()
      .from(whatsapp_connections)
      .where(eq(whatsapp_connections.id, connectionId))
      .then((rows) => rows[0])

    if (!connection) {
      throw new Error('Conexão WhatsApp não encontrada.')
    }

    return connection
  }

  private async updateConnection(
    connectionId: number,
    values: Partial<typeof whatsapp_connections.$inferInsert>,
  ) {
    await db
      .update(whatsapp_connections)
      .set({ ...values, updateAt: new Date() })
      .where(eq(whatsapp_connections.id, connectionId))
  }

  private attachLifecycleHandlers(
    connectionId: number,
    clientKey: string,
    client: WhatsappClient,
  ) {
    client.on('qr', async (qr) => {
      await this.updateConnection(connectionId, {
        status: 'qr_ready',
        lastQr: qr,
        lastQrAt: new Date(),
      })

      emitWhatsappRuntimeEvent(connectionId, {
        type: 'qr',
        payload: { status: 'qr_ready', qr },
      })
    })

    client.on('authenticated', async () => {
      await this.updateConnection(connectionId, {
        status: 'authenticated',
      })

      emitWhatsappRuntimeEvent(connectionId, {
        type: 'status',
        payload: { status: 'authenticated' },
      })
    })

    client.on('ready', async () => {
      await this.updateConnection(connectionId, {
        status: 'ready',
        connectedAt: new Date(),
      })

      emitWhatsappRuntimeEvent(connectionId, {
        type: 'status',
        payload: { status: 'ready' },
      })
    })

    client.on('auth_failure', async (message) => {
      await this.updateConnection(connectionId, {
        status: 'failed',
      })

      emitWhatsappRuntimeEvent(connectionId, {
        type: 'error',
        payload: { status: 'failed', message },
      })
    })

    client.on('disconnected', async (reason) => {
      await this.updateConnection(connectionId, {
        status: 'disconnected',
        disconnectedAt: new Date(),
      })

      cleanupWhatsappClientAuth(clientKey)
      this.runtimes.delete(connectionId)

      emitWhatsappRuntimeEvent(connectionId, {
        type: 'status',
        payload: { status: 'disconnected', reason },
      })
    })
  }

  async ensureRuntime(connectionId: number) {
    const current = this.runtimes.get(connectionId)
    if (current) return current

    const connection = await this.getConnection(connectionId)
    const client = createWhatsappClient(connection.clientKey)

    this.attachLifecycleHandlers(connectionId, connection.clientKey, client)
    bindWhatsappMessageHandlers(client, connectionId)

    const runtime = {
      client,
      initialized: false,
    }

    this.runtimes.set(connectionId, runtime)
    return runtime
  }

  async startConnection(connectionId: number) {
    const runtime = await this.ensureRuntime(connectionId)

    if (!runtime.initialized) {
      runtime.initialized = true
      await this.updateConnection(connectionId, {
        status: 'pending',
        disconnectedAt: null,
      })
      runtime.client.initialize()
    }

    return runtime
  }

  async disconnectConnection(connectionId: number) {
    const connection = await this.getConnection(connectionId)
    const runtime = this.runtimes.get(connectionId)

    if (runtime) {
      await runtime.client.destroy().catch(() => undefined)
      this.runtimes.delete(connectionId)
    }

    cleanupWhatsappClientAuth(connection.clientKey)
    await this.updateConnection(connectionId, {
      status: 'disconnected',
      disconnectedAt: new Date(),
    })

    emitWhatsappRuntimeEvent(connectionId, {
      type: 'status',
      payload: { status: 'disconnected' },
    })
  }

  getClient(connectionId: number) {
    return this.runtimes.get(connectionId)?.client ?? null
  }
}

export const whatsappConnectionManager = new WhatsappConnectionManager()