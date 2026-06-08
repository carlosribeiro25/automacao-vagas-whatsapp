import request from 'supertest'
import { test, expect } from 'vitest'
import { server } from '../src/app'
import { fakerPT_BR as faker } from '@faker-js/faker'
import { makeUser } from '../src/factore/make-user'
import { db } from '../src/db/index'
import { passwordResetTokens } from '../src/db/schema'
import { randomBytes } from 'node:crypto'

test('Recuperar senha', async () => {
    await server.ready()

    const response = request(server.server)
    .post('/forgot-password')
    .set('Content-type','application/json')
    .send({
        email: faker.internet.email()
    })

    expect((await response).status).toEqual(200)
    expect((await response).body).toEqual({
        message: expect.any(String)
    })

})

test('Resetar  senha', async () => {
    await server.ready()

    const { user } = await makeUser('user')
    const token = randomBytes(16).toString('hex')

    await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 15),
    })

    const result = request(server.server)
    .post('/reset-password')
    .set('Content-type', 'application/json')
    .send({
        token,
        newPassword: faker.internet.password({ length: 8 })
    })

    expect((await result).status).toEqual(200)
    expect((await result).body).toEqual({
        message: expect.any(String)
    })
})

test('Erro ao resetar  senha', async () => {
    await server.ready()

    const result = request(server.server)
    .post('/reset-password')
    .set('Content-type', 'application/json')
    .send({
        token: 'invalid-token-that-does-not-exist',
        newPassword: faker.internet.password({ length: 8 })
    })

    expect((await result).status).toEqual(400)
    expect((await result).body).toEqual({
        error: expect.any(String)
    })
})