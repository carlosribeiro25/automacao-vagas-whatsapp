import { randomUUID } from 'node:crypto'
import { db } from '../../db/index.js'
import { withDbRetry } from '../../db/retry.js'
import {
  grupos_whatsapp,
  mensagens,
  vagas,
  whatsapp_connection_groups,
  whatsapp_connections,
} from '../../db/schema.js'
import { checkAutentication } from '../../routes/hooks/check-request-jwt.js'
import { getAuthUserReq } from '../../utils/getAuthUser.js'
import { and, eq, inArray } from 'drizzle-orm'
import z from 'zod'
import { subscribeWhatsappRuntimeEvents } from '../../modules/whatsapp/whatsapp.events.js'
import { whatsappConnectionManager } from '../../modules/whatsapp/whatsapp.connection-manager.js'
async function getOwnedConnection(connectionId, userId) {
  return db
    .select()
    .from(whatsapp_connections)
    .where(
      and(
        eq(whatsapp_connections.id, connectionId),
        eq(whatsapp_connections.userId, userId),
      ),
    )
    .then((rows) => rows[0])
}
function writeSseEvent(reply, event) {
  reply.raw.write(`event: ${event.type}\n`)
  reply.raw.write(`data: ${JSON.stringify(event.payload)}\n\n`)
}
export const whatsappRoutes = async (app) => {
  app.get(
    '/whatsapp/connections',
    {
      preHandler: checkAutentication,
      schema: {
        tags: ['WhatsApp'],
        response: {
          200: z.array(
            z.object({
              id: z.number(),
              userId: z.number(),
              status: z.string(),
              phone: z.string().nullable(),
              clientKey: z.string(),
            }),
          ),
        },
      },
    },
    async (request) => {
      const userId = Number(getAuthUserReq(request).sub)
      const connections = await withDbRetry(() =>
        db
          .select()
          .from(whatsapp_connections)
          .where(eq(whatsapp_connections.userId, userId))
          .execute(),
      )
      return connections.map((connection) => ({
        id: connection.id,
        userId: connection.userId,
        status: connection.status,
        phone: connection.phone ?? null,
        clientKey: connection.clientKey,
      }))
    },
  )
  app.delete(
    '/whatsapp/connections/:id/delete',
    {
      preHandler: checkAutentication,
      schema: {
        tags: ['Whatsapp'],
        params: z.object({
          id: z.coerce.number(),
        }),
        response: {
          200: z.object({ message: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params
      const userId = Number(getAuthUserReq(request).sub)
      const connection = await getOwnedConnection(id, userId)
      if (!connection) {
        return reply.status(404).send({ error: 'Conexao nao encontrada' })
      }
      await withDbRetry(() =>
        db.delete(vagas).where(eq(vagas.connectionId, id)).execute(),
      )
      await withDbRetry(() =>
        db.delete(mensagens).where(eq(mensagens.connectionId, id)).execute(),
      )
      await withDbRetry(() =>
        db
          .delete(whatsapp_connection_groups)
          .where(eq(whatsapp_connection_groups.connectionId, id))
          .execute(),
      )
      const deletedConnection = await withDbRetry(() =>
        db
          .delete(whatsapp_connections)
          .where(
            and(
              eq(whatsapp_connections.id, id),
              eq(whatsapp_connections.userId, userId),
            ),
          )
          .returning()
          .execute(),
      )
      if (deletedConnection.length > 0) {
        return reply
          .status(200)
          .send({ message: 'Conexao deletada com sucesso' })
      }
      return reply.status(404).send({ error: 'Conexao nao encontrada' })
    },
  )
  app.post(
    '/whatsapp/connections',
    {
      preHandler: checkAutentication,
      schema: {
        tags: ['WhatsApp'],
        response: {
          201: z.object({
            id: z.number(),
            status: z.string(),
            clientKey: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const userId = Number(getAuthUserReq(request).sub)
      const clientKey = `wa-${userId}-${randomUUID()}`
      const [connection] = await withDbRetry(() =>
        db
          .insert(whatsapp_connections)
          .values({
            userId,
            clientKey,
            phone: null,
            status: 'pending',
          })
          .returning()
          .execute(),
      )
      return reply.status(201).send({
        id: connection.id,
        status: connection.status,
        clientKey: connection.clientKey,
      })
    },
  )
  app.post(
    '/whatsapp/connections/:id/start',
    {
      preHandler: checkAutentication,
      schema: {
        tags: ['WhatsApp'],
        params: z.object({ id: z.coerce.number().int() }),
        response: {
          200: z.object({ status: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const userId = Number(getAuthUserReq(request).sub)
      const { id } = request.params
      const connection = await getOwnedConnection(id, userId)
      if (!connection) {
        return reply.status(404).send({ error: 'Conexão não encontrada.' })
      }
      await whatsappConnectionManager.startConnection(connection.id)
      return { status: 'pending' }
    },
  )
  app.get(
    '/whatsapp/connections/:id/events',
    {
      preHandler: checkAutentication,
      schema: {
        tags: ['WhatsApp'],
        params: z.object({ id: z.coerce.number().int() }),
      },
    },
    async (request, reply) => {
      const userId = Number(getAuthUserReq(request).sub)
      const { id } = request.params
      const connection = await getOwnedConnection(id, userId)
      if (!connection) {
        return reply.status(404).send({ error: 'Conexão não encontrada.' })
      }
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      })
      writeSseEvent(reply, {
        type: 'status',
        payload: {
          status: connection.status,
          qr: connection.lastQr,
        },
      })
      const unsubscribe = subscribeWhatsappRuntimeEvents(id, (event) => {
        writeSseEvent(reply, event)
      })
      // Keepalive a cada 20s para evitar timeout do proxy (Fly.io fecha conexões inativas em ~60s)
      const keepalive = setInterval(() => {
        reply.raw.write(': ping\n\n')
      }, 20_000)
      request.raw.on('close', () => {
        clearInterval(keepalive)
        unsubscribe()
        reply.raw.end()
      })
    },
  )
  app.get(
    '/whatsapp/connections/:id/groups',
    {
      preHandler: checkAutentication,
      schema: {
        tags: ['WhatsApp'],
        params: z.object({ id: z.coerce.number().int() }),
        response: {
          200: z.array(
            z.object({
              id: z.number(),
              name: z.string(),
              whatsappId: z.string(),
              selected: z.boolean(),
            }),
          ),
          404: z.object({ error: z.string() }),
          503: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const userId = Number(getAuthUserReq(request).sub)
      const { id } = request.params
      const connection = await getOwnedConnection(id, userId)
      if (!connection) {
        return reply.status(404).send({ error: 'Conexão não encontrada.' })
      }
      const client = whatsappConnectionManager.getClient(id)
      if (!client) {
        return reply.status(200).send([])
      }
      if (connection.status !== 'ready') {
        return reply.status(200).send([])
      }
      let chats
      try {
        chats = await Promise.race([
          client.getChats(),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('timeout')), 30_000)
          }),
        ])
      } catch (error) {
        request.log.error(
          { err: error },
          'Falha ao sincronizar grupos do WhatsApp',
        )
        return reply.status(503).send({
          error: 'WhatsApp ocupado, tente novamente em instantes.',
        })
      }
      const syncedGroups = []
      for (const chat of chats) {
        const normalizedChat = chat
        const whatsappId = normalizedChat.id?._serialized
        const isSelectableGroup =
          normalizedChat.isGroup || normalizedChat.id?.server === 'newsletter'
        if (!whatsappId || !isSelectableGroup) continue
        let group = await withDbRetry(() =>
          db
            .select()
            .from(grupos_whatsapp)
            .where(eq(grupos_whatsapp.whatsaapId, whatsappId))
            .then((rows) => rows[0]),
        )
        if (!group) {
          const [insertedGroup] = await withDbRetry(() =>
            db
              .insert(grupos_whatsapp)
              .values({
                name: normalizedChat.name,
                whatsaapId: whatsappId,
              })
              .returning()
              .execute(),
          )
          group = insertedGroup
        }
        await withDbRetry(() =>
          db
            .insert(whatsapp_connection_groups)
            .values({
              connectionId: id,
              groupId: group.id,
            })
            .onConflictDoNothing()
            .execute(),
        )
        const relation = await withDbRetry(() =>
          db
            .select()
            .from(whatsapp_connection_groups)
            .where(
              and(
                eq(whatsapp_connection_groups.connectionId, id),
                eq(whatsapp_connection_groups.groupId, group.id),
              ),
            )
            .then((rows) => rows[0]),
        )
        syncedGroups.push({
          id: group.id,
          name: group.name,
          whatsappId: group.whatsaapId,
          selected: relation?.selected ?? false,
        })
      }
      return syncedGroups
    },
  )
  app.post(
    '/whatsapp/connections/:id/groups/select',
    {
      preHandler: checkAutentication,
      schema: {
        tags: ['WhatsApp'],
        params: z.object({ id: z.coerce.number().int().positive() }),
        body: z.object({
          groupIds: z
            .array(z.coerce.number().int().positive())
            .optional()
            .default([]),
        }),
        response: {
          200: z.object({ success: z.boolean() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const userId = Number(getAuthUserReq(request).sub)
      const { id } = request.params
      const { groupIds } = request.body
      const connection = await getOwnedConnection(id, userId)
      if (!connection) {
        return reply.status(404).send({ error: 'Conexão não encontrada.' })
      }
      await db
        .update(whatsapp_connection_groups)
        .set({ selected: false, updateAt: new Date() })
        .where(eq(whatsapp_connection_groups.connectionId, id))
      if (groupIds.length > 0) {
        await db
          .update(whatsapp_connection_groups)
          .set({ selected: true, updateAt: new Date() })
          .where(
            and(
              eq(whatsapp_connection_groups.connectionId, id),
              inArray(whatsapp_connection_groups.groupId, groupIds),
            ),
          )
      }
      return { success: true }
    },
  )
  app.post(
    '/whatsapp/connections/:id/disconnect',
    {
      preHandler: checkAutentication,
      schema: {
        tags: ['WhatsApp'],
        params: z.object({ id: z.coerce.number().int().positive() }),
        response: {
          200: z.object({ success: z.boolean() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const userId = Number(getAuthUserReq(request).sub)
      const { id } = request.params
      const connection = await getOwnedConnection(id, userId)
      if (!connection) {
        return reply.status(404).send({ error: 'Conexão não encontrada.' })
      }
      await whatsappConnectionManager.disconnectConnection(id)
      return { success: true }
    },
  )
}
