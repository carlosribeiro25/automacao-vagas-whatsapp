import { test, expect, beforeEach } from "vitest";
import request from "supertest";
import { server } from "../src/app";
import { db } from '../src/db/index'
import { vagas } from '../src/db/schema'
import { makeVaga } from '../src/factore/make-vagas'
import { authenticationUser } from "../src/factore/make-user";

test('Lista todas as tarefas', async () => {
    await server.ready()
    const { token } = await authenticationUser('user')

    const result = request(server.server)
        .get('/vagas')
        .set('Authorization', token)

    expect((await result).status).toEqual(200)
    expect(((await result).body)).toEqual({
        vagas: expect.any(Array),
        hasMore: expect.any(Boolean),
        page: expect.any(Number),
        total: expect.any(Number)
    })
})

test('Nenhuma vaga encontrada', async () => {
    await server.ready()

    const { token } = await authenticationUser('manager')

    await db.delete(vagas)

    const result = request(server.server)
        .get('/vagas')
        .set('Authorization', token)

    expect((await result).status).toEqual(404)
    expect((await result).body).toEqual({
        error: 'Nenhuma vaga encontrada'
    })
})

test('Pegar vagas pelo id', async () => {
    await server.ready()

    const { token } = await authenticationUser('user')

    const vagaId = await makeVaga()

    const resultado = request(server.server)
        .get(`/vagas/${vagaId}`)
        .set('Authorization', token)

    expect((await resultado).status).toEqual(200)
    expect((await resultado).body).toEqual(
        expect.objectContaining({
            title: expect.any(String),
            is_job: expect.any(Boolean),
        })
    )
})

test('Vaga nao encontrada', async () => {
    await server.ready()

    const { token } = await authenticationUser('manager')
    const taskId = await makeVaga()
    await db.delete(vagas)

    const resulReq = request(server.server)
        .get(`/vagas/${taskId}`)
        .set('Authorization', token)


    expect((await resulReq).status).toEqual(404)
    expect((await resulReq).body).toEqual({
        error: 'Vaga nao encontrada'
    })

})

test('Pegar vagas por filtros', async () => {
    await server.ready()

    const { token } = await authenticationUser('user')

    await makeVaga()
    const resulafailter = request(server.server)
        .get('/vagas/filtros')
        .set('Authorization', token)

    const body = (await resulafailter).body
    expect((await resulafailter).status).toEqual(200)
    expect(body.vagas).toBeInstanceOf(Array)
    expect(body.vagas[0]).toEqual(
        expect.objectContaining({
            category: expect.any(String),
            location: expect.any(String),
        })
    )
})

test('Not Found', async () => {
    await server.ready()

    const { token } = await authenticationUser('manager')

    await db.delete(vagas)

    const filter = request(server.server)
    .get('/vagas/filtros')
    .set('Authorization', token)

    expect((await filter).status).toEqual(404)
    expect((await filter).body).toEqual({
        error: 'Nenhuma vaga encontrada com o filtro aplicado'
    })
})

test('Pegar vagar pela pesquisa', async () => {
    await server.ready()

    const { token } = await authenticationUser('user')

    await makeVaga()

    const resultSearch = request(server.server)
    .get('/search')
    .set('Authorization', token)
    .query({ q: 'Fullstack' })

    const body = (await resultSearch).body
    expect(( await resultSearch).status).toEqual(200)
    expect(body.vagas).toBeInstanceOf(Array)
    expect(body.vagas[0]).toEqual(
        expect.objectContaining({
          title: expect.any(String),
          category: expect.any(String),
          location: expect.any(String)  
        })
    )

})

test('Nenhuma vaga encontrada para a pesquisa', async () => {
    await server.ready()

    const { token } = await authenticationUser('user')
    
    await db.delete(vagas)

    const filter = request(server.server)
    .get('/search')
    .set('Authorization', token)
    .query({ q: 'Desenvolvedor'})

    expect((await filter).status).toEqual(404)
    expect((await filter).body).toEqual({
        error: 'Nenhuma vaga encontrada para a pesquisa'
    })
})
