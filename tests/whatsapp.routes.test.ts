import { test, expect, vi, afterEach } from 'vitest'
import request from 'supertest'
import { server } from '../src/app'
import { authenticationUser } from '../src/factore/make-user'
import { db } from '../src/db'
import { faker } from '@faker-js/faker'
import {
  grupos_whatsapp,
  mensagens,
  vagas,
  whatsapp_connection_groups,
  whatsapp_connections,
} from '../src/db/schema'
import { whatsappConnectionManager } from '../src/modules/whatsapp/whatsapp.connection-manager'
import { and, eq } from 'drizzle-orm'

afterEach(() => {
  vi.restoreAllMocks()
})

test('Testa conexao com whatsapp', async () => {
  await server.ready()

  const { token, user } = await authenticationUser('user')

  const result = await request(server.server)
    .post('/whatsapp/connections')
    .set('Content-Type', 'application/json')
    .set('Authorization', token)
    .send({})

  expect(result.status).toEqual(201)
  expect(result.body).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      status: 'pending',
      clientKey: expect.stringMatching(new RegExp(`^wa-${user.id}-`)),
    }),
  )
})

test('Conexao com whatsapp', async () => {
  await server.ready()

  const { token, user } = await authenticationUser('user')

  const [connection] = await db
    .insert(whatsapp_connections)
    .values({
      userId: user.id,
      status: 'pending',
      clientKey: faker.string.uuid(),
      phone: null,
    })
    .returning()

  const result = await request(server.server)
    .get('/whatsapp/connections')
    .set('Authorization', token)

  expect(result.status).toEqual(200)
  expect(result.body).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        clientKey: connection.clientKey,
        id: connection.id,
        phone: null,
        status: 'pending',
        userId: user.id,
      }),
    ]),
  )
})

test('Inicia conexao do whatsapp', async () => {
  await server.ready()

  const { token, user } = await authenticationUser('user')
  const [connection] = await db
    .insert(whatsapp_connections)
    .values({
      userId: user.id,
      status: 'pending',
      clientKey: faker.string.uuid(),
      phone: null,
    })
    .returning()

  const startSpy = vi
    .spyOn(whatsappConnectionManager, 'startConnection')
    .mockResolvedValue({
      initialized: true,
      client: {} as never,
    })

  const result = await request(server.server)
    .post(`/whatsapp/connections/${connection.id}/start`)
    .set('Authorization', token)

  expect(result.status).toEqual(200)
  expect(result.body).toEqual({ status: 'pending' })
  expect(startSpy).toHaveBeenCalledWith(connection.id)
})

test('Nao inicia conexao de outro usuario', async () => {
  await server.ready()

  const { user } = await authenticationUser('user')
  const { token } = await authenticationUser('user')

  const [connection] = await db
    .insert(whatsapp_connections)
    .values({
      userId: user.id,
      status: 'pending',
      clientKey: faker.string.uuid(),
      phone: null,
    })
    .returning()

  const result = await request(server.server)
    .post(`/whatsapp/connections/${connection.id}/start`)
    .set('Authorization', token)

  expect(result.status).toEqual(404)
  expect(result.body).toEqual({ error: 'Conexão não encontrada.' })
})

test('Retorna 404 ao abrir eventos de conexao inexistente', async () => {
  await server.ready()

  const { token } = await authenticationUser('user')

  const result = await request(server.server)
    .get('/whatsapp/connections/999999/events')
    .set('Authorization', token)

  expect(result.status).toEqual(404)
  expect(result.body).toEqual({ error: 'Conexão não encontrada.' })
})

test('Abre stream SSE com status inicial da conexao', async () => {
  await server.ready()

  const { token, user } = await authenticationUser('user')
  const [connection] = await db
    .insert(whatsapp_connections)
    .values({
      userId: user.id,
      status: 'qr_ready',
      clientKey: faker.string.uuid(),
      phone: null,
      lastQr: 'qr-code-test',
    })
    .returning()

  if (!server.server.listening) {
    await server.listen({ port: 0, host: '127.0.0.1' })
  }

  const address = server.server.address()

  if (!address || typeof address === 'string') {
    throw new Error('Servidor HTTP não está ouvindo em uma porta válida.')
  }

  const controller = new AbortController()
  const response = await fetch(
    `http://127.0.0.1:${address.port}/whatsapp/connections/${connection.id}/events`,
    {
      headers: {
        Authorization: token,
      },
      signal: controller.signal,
    },
  )

  expect(response.status).toEqual(200)
  expect(response.headers.get('content-type')).toContain('text/event-stream')

  const reader = response.body?.getReader()
  expect(reader).toBeDefined()

  const { value, done } = await reader!.read()
  const chunk = new TextDecoder().decode(value)

  expect(done).toEqual(false)
  expect(chunk).toContain('event: status')
  expect(chunk).toContain('"status":"qr_ready"')
  expect(chunk).toContain('"qr":"qr-code-test"')

  controller.abort()
  await reader?.cancel().catch(() => undefined)
})

test('Retorna lista vazia ao listar grupos sem runtime iniciado', async () => {
  await server.ready()

  const { token, user } = await authenticationUser('user')
  const [connection] = await db
    .insert(whatsapp_connections)
    .values({
      userId: user.id,
      status: 'pending',
      clientKey: faker.string.uuid(),
      phone: null,
    })
    .returning()

  vi.spyOn(whatsappConnectionManager, 'getClient').mockReturnValue(null)

  const result = await request(server.server)
    .get(`/whatsapp/connections/${connection.id}/groups`)
    .set('Authorization', token)

  expect(result.status).toEqual(200)
  expect(result.body).toEqual([])
})

test('Lista e sincroniza grupos da conexao', async () => {
  await server.ready()

  const { token, user } = await authenticationUser('user')
  const [connection] = await db
    .insert(whatsapp_connections)
    .values({
      userId: user.id,
      status: 'ready',
      clientKey: faker.string.uuid(),
      phone: null,
    })
    .returning()

  vi.spyOn(whatsappConnectionManager, 'getClient').mockReturnValue({
    getChats: vi.fn().mockResolvedValue([
      {
        name: 'Grupo 1',
        isGroup: true,
        id: { _serialized: '120363111111111@g.us', server: 'g.us' },
      },
      {
        name: 'Canal 1',
        id: { _serialized: 'newsletter-1@newsletter', server: 'newsletter' },
      },
      {
        name: 'Chat privado',
        id: { _serialized: '5511999999999@c.us', server: 'c.us' },
      },
    ]),
  } as never)

  const result = await request(server.server)
    .get(`/whatsapp/connections/${connection.id}/groups`)
    .set('Authorization', token)

  expect(result.status).toEqual(200)
  expect(result.body).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'Grupo 1',
        whatsappId: '120363111111111@g.us',
        selected: false,
      }),
      expect.objectContaining({
        name: 'Canal 1',
        whatsappId: 'newsletter-1@newsletter',
        selected: false,
      }),
    ]),
  )
  expect(result.body).toHaveLength(2)

  const relations = await db
    .select()
    .from(whatsapp_connection_groups)
    .where(eq(whatsapp_connection_groups.connectionId, connection.id))

  expect(relations).toHaveLength(2)
})

test('Seleciona grupos monitorados da conexao', async () => {
  await server.ready()

  const { token, user } = await authenticationUser('user')
  const [connection] = await db
    .insert(whatsapp_connections)
    .values({
      userId: user.id,
      status: 'ready',
      clientKey: faker.string.uuid(),
      phone: null,
    })
    .returning()

  const [groupA] = await db
    .insert(grupos_whatsapp)
    .values({
      name: 'Grupo A',
      whatsaapId: faker.string.uuid(),
    })
    .returning()

  const [groupB] = await db
    .insert(grupos_whatsapp)
    .values({
      name: 'Grupo B',
      whatsaapId: faker.string.uuid(),
    })
    .returning()

  await db.insert(whatsapp_connection_groups).values([
    {
      connectionId: connection.id,
      groupId: groupA.id,
      selected: false,
    },
    {
      connectionId: connection.id,
      groupId: groupB.id,
      selected: true,
    },
  ])

  const result = await request(server.server)
    .post(`/whatsapp/connections/${connection.id}/groups/select`)
    .set('Authorization', token)
    .send({ groupIds: [groupA.id] })

  expect(result.status).toEqual(200)
  expect(result.body).toEqual({ success: true })

  const relations = await db
    .select()
    .from(whatsapp_connection_groups)
    .where(eq(whatsapp_connection_groups.connectionId, connection.id))

  expect(relations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ groupId: groupA.id, selected: true }),
      expect.objectContaining({ groupId: groupB.id, selected: false }),
    ]),
  )
})

test('Desconecta conexao do whatsapp', async () => {
  await server.ready()

  const { token, user } = await authenticationUser('user')
  const [connection] = await db
    .insert(whatsapp_connections)
    .values({
      userId: user.id,
      status: 'ready',
      clientKey: faker.string.uuid(),
      phone: null,
    })
    .returning()

  const disconnectSpy = vi
    .spyOn(whatsappConnectionManager, 'disconnectConnection')
    .mockResolvedValue(undefined)

  const result = await request(server.server)
    .post(`/whatsapp/connections/${connection.id}/disconnect`)
    .set('Authorization', token)

  expect(result.status).toEqual(200)
  expect(result.body).toEqual({ success: true })
  expect(disconnectSpy).toHaveBeenCalledWith(connection.id)
})

test('Deleta conexao com dependencias sem erro de FK', async () => {
  await server.ready()

  const { token, user } = await authenticationUser('user')
  const [connection] = await db
    .insert(whatsapp_connections)
    .values({
      userId: user.id,
      status: 'ready',
      clientKey: faker.string.uuid(),
      phone: null,
    })
    .returning()

  const [group] = await db
    .insert(grupos_whatsapp)
    .values({
      name: 'Grupo delete',
      whatsaapId: faker.string.uuid(),
    })
    .returning()

  const [message] = await db
    .insert(mensagens)
    .values({
      connectionId: connection.id,
      grupoId: group.id,
      conteudo: 'mensagem teste',
      data: new Date(),
    })
    .returning()

  await db.insert(whatsapp_connection_groups).values({
    connectionId: connection.id,
    groupId: group.id,
    selected: true,
  })

  await db.insert(vagas).values({
    connectionId: connection.id,
    mensagemId: message.id,
    title: 'vaga teste',
    is_job: true,
  })

  const result = await request(server.server)
    .delete(`/whatsapp/connections/${connection.id}/delete`)
    .set('Authorization', token)

  expect(result.status).toEqual(200)
  expect(result.body).toEqual({ message: 'Conexao deletada com sucesso' })

  const remainingConnection = await db
    .select()
    .from(whatsapp_connections)
    .where(eq(whatsapp_connections.id, connection.id))
    .then((rows) => rows[0])

  expect(remainingConnection).toBeUndefined()
})
