import { test, expect } from 'vitest'
import request from 'supertest'
import { server } from '../src/app'
import { authenticationUser } from '../src/factore/make-user'
import { arrayContains } from 'drizzle-orm'

test('login', async () => {
  await server.ready()
  const { user, token, passwordHash } = await authenticationUser('user')

  const response = request(server.server)
    .post('/login')
    .set('Content-Type', 'application/json')
    .set('Authorization', token)
    .send({
      email: user.email,
      password: passwordHash,
    })

  expect((await response).status).toEqual(200)
  expect((await response).body).toEqual({
    token: expect.any(String),
    user: expect.objectContaining({
      id: expect.any(Number),
      name: expect.any(String),
      email: expect.any(String),
      phone: expect.any(String),
      picture: null
  })
    })
  })


test('Credenciais invalidas', async () => {
  await server.ready()

  const { token } = await authenticationUser('user')

  const response = request(server.server)
    .post('/login')
    .set('Content-Type', 'application/json')
    .set('Authorization', token)
    .send({
      email: 'celia744pooo@hotmail.com',
      password: '2026dev37',
    })

  expect((await response).status).toEqual(400)
  expect((await response).body).toEqual({
    error:
      'Credencias inválidas, verifique se o email ou senha estao corretos.',
  })
})
