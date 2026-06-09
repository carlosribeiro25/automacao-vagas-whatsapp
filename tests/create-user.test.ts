import { test, expect } from 'vitest'
import request from 'supertest'
import { server } from '../src/app'
import { faker } from '@faker-js/faker'

test('Usuario criado com sucesso', async () => {
  await server.ready()

  const response = request(server.server)
    .post('/registerUser')
    .set('Content-Type', 'application/json')
    .send({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      password: faker.internet.password(),
      role: 'user',
    })

  expect((await response).status).toEqual(201)
  expect((await response).body).toEqual({
    message: 'Usuario cadastrado com sucesso',
    usersId: expect.any(Number),
  })
})

test('Campos obrigatorios ausentes', async () => {
  await server.ready()

  const response = request(server.server)
    .post('/registerUser')
    .set('Content-Type', 'application/json')
    .send({
      name: '',
      email: 'sjdhshd@gmail.com',
      phone: faker.phone.number(),
      password: '',
      role: 'user',
    })

  expect((await response).status).toEqual(400)
  expect((await response).body).toEqual({
    error: 'Bad Request',
  })
})

test('Nome com menos de 4 caracteres → 400', async () => {
  await server.ready()

  const response = request(server.server)
    .post('/registerUser')
    .set('Content-Type', 'application/json')
    .send({
      name: 'Ana',
      email: faker.internet.email(),
      phone: faker.phone.number(),
      password: faker.internet.password(),
      role: 'user',
    })

  expect((await response).status).toEqual(400)
  expect((await response).body).toEqual({
    error: 'Dados inválidos ou malformados',
  })
})

test('Conflitos de email existente', async () => {
  await server.ready()

  const response = request(server.server)
    .post('/registerUser')
    .set('Content-Type', 'application/json')
    .send({
      name: faker.person.fullName(),
      email: 'wc8025470@gmail.com',
      phone: faker.phone.number(),
      password: faker.internet.password(),
    })

  expect((await response).status).toEqual(409)
  expect((await response).body).toEqual({
    duplicate: 'Email ja esta cadastrado',
  })
})
