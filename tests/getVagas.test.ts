import { server } from '../src/app'
import { expect, test } from 'vitest'
import request from 'supertest'
import { authenticationUser } from '../src/factore/make-user'
import { db } from '../src/db/index'
import { vagas } from '../src/db/schema'

test('Testar filtros', async () => {
  await server.ready()

  const { token } = await authenticationUser('user')

  await db.insert(vagas).values({
    title: 'Vaga Filtro Test',
    modality: 'Remoto',
    is_job: true,
  })

  const result = request(server.server)
    .get('/vagas/filtros?modality=Remoto')
    .set('Authorization', token)

  expect((await result).status).toEqual(200)
  expect((await result).body).toEqual({
    vagas: expect.any(Array),
    hasMore: expect.any(Boolean),
    page: expect.any(Number),
    total: expect.any(Number),
  })
})
