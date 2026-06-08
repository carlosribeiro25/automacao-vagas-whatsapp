import { test, expect } from 'vitest'
import request from 'supertest'
import { server } from '../src/app'
import { makeUser } from '../src/factore/make-user'

test('Rota de logout', async () => {
  await server.ready()

  const result = request(server.server).post('/logout')

  expect((await result).status).toEqual(204)
})

test('Refresh token', async () => {
  await server.ready()

  const { user, passwordHash } = await makeUser('user')

  const loginRes = await request(server.server)
    .post('/login')
    .send({ email: user.email, password: passwordHash })

  expect(loginRes.status).toEqual(200)

  const setCookieHeader = loginRes.headers['set-cookie']
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : []
  expect(cookies).toBeDefined()

  const response = await request(server.server)
    .post('/refresh')
    .set('Cookie', cookies)

  expect(response.status).toEqual(200)
  expect(response.body).toEqual({
    accessToken: expect.any(String),
  })
})

test('Token invalido', async () => {
  await server.ready()

  const response = await request(server.server).post('/refresh')

  expect(response.status).toEqual(401)
  expect(response.body).toEqual({
    error: expect.any(String),
  })
})
