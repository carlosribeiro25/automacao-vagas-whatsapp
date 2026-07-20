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

test('Filtrar vagas por location', async () => {
  await server.ready()

  const { token } = await authenticationUser('user')

  await db.insert(vagas).values([
    {
      title: 'Vaga Cambeba',
      location: 'Cambeba',
      city: 'Fortaleza',
      is_job: true,
    },
    {
      title: 'Vaga Messejana',
      location: 'Messejana',
      city: 'Fortaleza',
      is_job: true,
    },
  ])

  const result = request(server.server)
    .get('/vagas/filtros?location=Cambeba')
    .set('Authorization', token)

  expect((await result).status).toEqual(200)
  expect((await result).body.vagas).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        title: 'Vaga Cambeba',
      }),
    ]),
  )
  expect((await result).body.vagas).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        title: 'Vaga Messejana',
      }),
    ]),
  )
})
