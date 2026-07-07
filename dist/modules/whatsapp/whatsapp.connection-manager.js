import { db } from '../../db/index.js'
import { whatsapp_connections } from '../../db/schema.js'
import { eq } from 'drizzle-orm'
import {
  cleanupWhatsappClientAuth,
  createWhatsappClient,
} from './whatsapp.client.js'
import { emitWhatsappRuntimeEvent } from './whatsapp.events.js'
import { bindWhatsappMessageHandlers } from './whatsaap.worker.js'
const RETRIABLE_DB_ERROR_PATTERN =
  /fetch failed|und_err_socket|other side closed|socket|econnreset|etimedout|eai_again|error connecting to database/i
class WhatsappConnectionManager {
  runtimes = new Map()
  async wait(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms))
  }
  isRetriableDbError(error) {
    const message = error instanceof Error ? error.message : String(error)
    return RETRIABLE_DB_ERROR_PATTERN.test(message)
  }
  logRuntimeError(context, connectionId, error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[WhatsApp][${context}] conexão=${connectionId}: ${message}`)
  }
  async getConnection(connectionId) {
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
  async updateConnection(connectionId, values) {
    await db
      .update(whatsapp_connections)
      .set({ ...values, updateAt: new Date() })
      .where(eq(whatsapp_connections.id, connectionId))
  }
  async updateConnectionWithRetry(
    connectionId,
    values,
    context,
    maxAttempts = 3,
  ) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.updateConnection(connectionId, values)
        return
      } catch (error) {
        const isLastAttempt = attempt === maxAttempts
        this.logRuntimeError(
          `${context} attempt=${attempt}/${maxAttempts}`,
          connectionId,
          error,
        )
        if (isLastAttempt || !this.isRetriableDbError(error)) {
          throw error
        }
        await this.wait(200 * attempt)
      }
    }
  }
  attachLifecycleHandlers(connectionId, clientKey, client) {
    client.on('qr', async (qr) => {
      try {
        await this.updateConnectionWithRetry(
          connectionId,
          {
            status: 'qr_ready',
            lastQr: qr,
            lastQrAt: new Date(),
          },
          'event:qr',
        )
        emitWhatsappRuntimeEvent(connectionId, {
          type: 'qr',
          payload: { status: 'qr_ready', qr },
        })
      } catch (error) {
        this.logRuntimeError('event:qr', connectionId, error)
      }
    })
    client.on('authenticated', async () => {
      try {
        await this.updateConnectionWithRetry(
          connectionId,
          {
            status: 'authenticated',
          },
          'event:authenticated',
        )
        emitWhatsappRuntimeEvent(connectionId, {
          type: 'status',
          payload: { status: 'authenticated' },
        })
      } catch (error) {
        this.logRuntimeError('event:authenticated', connectionId, error)
      }
    })
    client.on('ready', async () => {
      try {
        await this.updateConnectionWithRetry(
          connectionId,
          {
            status: 'ready',
            connectedAt: new Date(),
          },
          'event:ready',
        )
        emitWhatsappRuntimeEvent(connectionId, {
          type: 'status',
          payload: { status: 'ready' },
        })
      } catch (error) {
        this.logRuntimeError('event:ready', connectionId, error)
      }
    })
    client.on('auth_failure', async (message) => {
      try {
        await this.updateConnectionWithRetry(
          connectionId,
          {
            status: 'failed',
          },
          'event:auth_failure',
        )
        emitWhatsappRuntimeEvent(connectionId, {
          type: 'error',
          payload: { status: 'failed', message },
        })
      } catch (error) {
        this.logRuntimeError('event:auth_failure', connectionId, error)
      }
    })
    client.on('disconnected', async (reason) => {
      try {
        await this.updateConnectionWithRetry(
          connectionId,
          {
            status: 'disconnected',
            disconnectedAt: new Date(),
          },
          'event:disconnected',
        )
        cleanupWhatsappClientAuth(clientKey)
        this.runtimes.delete(connectionId)
        emitWhatsappRuntimeEvent(connectionId, {
          type: 'status',
          payload: { status: 'disconnected', reason },
        })
      } catch (error) {
        this.logRuntimeError('event:disconnected', connectionId, error)
        cleanupWhatsappClientAuth(clientKey)
        this.runtimes.delete(connectionId)
      }
    })
  }
  async ensureRuntime(connectionId) {
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
  async startConnection(connectionId) {
    const runtime = await this.ensureRuntime(connectionId)
    if (!runtime.initialized) {
      runtime.initialized = true
      await this.updateConnectionWithRetry(
        connectionId,
        {
          status: 'pending',
          disconnectedAt: null,
        },
        'startConnection:pending',
      )
      // Prevent unhandled promise rejections from tearing down the Node process.
      const initializeResult = (() => {
        try {
          return runtime.client.initialize()
        } catch (error) {
          this.logRuntimeError('initialize:sync', connectionId, error)
          return undefined
        }
      })()
      void Promise.resolve(initializeResult).catch((error) => {
        void (async () => {
          this.logRuntimeError('initialize', connectionId, error)
          const activeRuntime = this.runtimes.get(connectionId)
          if (activeRuntime !== runtime) return
          runtime.initialized = false
          this.runtimes.delete(connectionId)
          await this.updateConnectionWithRetry(
            connectionId,
            { status: 'failed', disconnectedAt: new Date() },
            'initialize:failed',
          )
          emitWhatsappRuntimeEvent(connectionId, {
            type: 'error',
            payload: {
              status: 'failed',
              message:
                error instanceof Error
                  ? error.message
                  : 'Falha ao inicializar conexão WhatsApp.',
            },
          })
        })().catch((nestedError) => {
          this.logRuntimeError('initialize:nested', connectionId, nestedError)
        })
      })
    }
    return runtime
  }
  async disconnectConnection(connectionId) {
    const connection = await this.getConnection(connectionId)
    const runtime = this.runtimes.get(connectionId)
    if (runtime) {
      await runtime.client.destroy().catch((error) => {
        this.logRuntimeError('destroy', connectionId, error)
      })
      this.runtimes.delete(connectionId)
    }
    cleanupWhatsappClientAuth(connection.clientKey)
    await this.updateConnectionWithRetry(
      connectionId,
      {
        status: 'disconnected',
        disconnectedAt: new Date(),
      },
      'disconnectConnection',
    )
    emitWhatsappRuntimeEvent(connectionId, {
      type: 'status',
      payload: { status: 'disconnected' },
    })
  }
  getClient(connectionId) {
    return this.runtimes.get(connectionId)?.client ?? null
  }
}
export const whatsappConnectionManager = new WhatsappConnectionManager()
