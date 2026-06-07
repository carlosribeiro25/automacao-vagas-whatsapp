import { expect, test } from 'vitest'
import request from 'supertest'
import { server } from '../src/app'
import { fakerPT_BR as faker } from '@faker-js/faker'
import { authenticationUser, makeUser } from '../src/factore/make-user'

test('Cadastro atualizado com sucesso', async () => {
    await server.ready()

    const { token } = await authenticationUser('user')

    const { user } = await makeUser()

    const response = request(server.server)
    .patch(`/updateUser/${user.id}`)
    .set('Content-Type' ,'application/json')
    .set('Authorization', token)
    .send({
       email: faker.internet.email().toLowerCase(),
       phone: faker.phone.number(),
       password: faker.string.uuid(),
       picture: faker.image.avatar()
    })

    expect((await response).status).toEqual(200)
    expect((await response).body).toEqual({
        message: 'Usuario atualizado com sucesso'
    })
})

test('Usuario nao encontrado', async () => {
    await server.ready()

    const { token } = await authenticationUser('user')

    const response = request(server.server)
    .patch('/updateUser/999999')
    .set('Content-Type', 'application/json')
    .set('Authorization', token)
    .send({
        email: faker.internet.email(),
        phone: faker.phone.number(),
        password: faker.string.uuid(),
        picture: faker.image.avatar()
    })

    expect((await response).status).toEqual(404)
    expect( (await response).body).toEqual({
        error: 'Usuario nao encontrado'
    })
})

test('Conflitos de email existente', async () => {
    await server.ready()

    const { user } = await makeUser()

    const { token } = await authenticationUser('user')

    const response = request(server.server)
    .patch(`/updateUser/${user.id}`)
    .set('Authorization', token)
    .set('Content-Type', 'application/json')
    .send({
        email: 'margarida.barros@hotmail.com',
        phone: faker.phone.number(),
        password: faker.string.uuid(),
        picture: faker.image.avatar()
    })

    expect((await response).status).toEqual(409)
    expect( (await response).body).toEqual({
        emailExist: 'Email ja esta cadastrado'
    })
})

    
