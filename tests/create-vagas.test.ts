import { test, expect } from 'vitest'
import request from 'supertest'
import { server } from '../src/app'
import { faker } from '@faker-js/faker'

test('Vaga cadastrada com sucesso', async () => {
  await server.ready()

  const response = await request(server.server)
    .post('/register')
    .set('Content-Type', 'application/json')
    .send({
      title: faker.lorem.words(4),
      message: faker.lorem.words(4),
      tipo_vaga: faker.lorem.word(),
      description: faker.lorem.words(4),
      category: faker.lorem.word(),
      company: faker.lorem.words(2),
      requirements: faker.lorem.words(4),
      modality: 'Remoto',
      salary: faker.number.int({ min: 1, max: 30000 }),
      benefits: faker.lorem.words(4),
      contact: faker.lorem.words(4),
      link: faker.internet.url(),
      location: faker.lorem.words(2),
    })

  expect(response.status).toEqual(201)
  expect(response.body).toEqual({
    message: 'Vaga cadastrada com sucesso',
    vagaId: expect.any(Number),
  })
})

test('Testar modalidade fora da modality enum', async () => {
  await server.ready()

  const response = await request(server.server)
    .post('/register')
    .set('Content-Type', 'application/json')
    .send({
      title: faker.lorem.words(4),
      message: faker.lorem.words(4),
      tipo_vaga: faker.lorem.word(),
      description: faker.lorem.words(4),
      category: faker.lorem.word(),
      company: faker.lorem.words(2),
      requirements: faker.lorem.words(4),
      modality: 'Qualquer uma',
      salary: faker.lorem.word(),
      benefits: faker.lorem.words(4),
      contact: faker.lorem.words(4),
      link: faker.internet.url(),
      location: faker.lorem.words(2),
    })
  expect(response.status).toEqual(400)
  expect(response.body).toEqual({
    error: 'Bad Request',
  })
})
