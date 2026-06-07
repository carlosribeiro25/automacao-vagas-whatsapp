import { server } from '../src/app'
import { expect, test } from 'vitest'
import request from 'supertest'
import { authenticationUser } from '../src/factore/make-user'

test('Testar filtros', async () => {
  await server.ready()

  const { token } = await authenticationUser('user')

  // Garante que existe pelo menos uma vaga com modality Remoto no banco.
  // makeVaga usa faker.helpers.arrayElement para modality, então criamos
  // diretamente via POST para ter controle do valor.
  await request(server.server)
    .post('/register')
    .set('Content-Type', 'application/json')
    .set('Authorization', token)
    .send({
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
  })
})
