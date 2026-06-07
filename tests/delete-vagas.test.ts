import  request  from "supertest";
import { test, expect } from "vitest";
import { server } from "../src/app";
import { makeVaga } from "../src/factore/make-vagas";
import { authenticationUser } from "../src/factore/make-user";

test('Vaga deletada com sucesso', async () => {
    await server.ready()

    const { token } = await authenticationUser('manager')

    const vagaId = await makeVaga()

    const response = request(server.server)
    .delete(`/vagas/${vagaId}`)
    .set('Authorization', token)

    expect((await response).status).toEqual(200)
    expect((await response).body).toEqual({
        message: 'Vaga deletada com sucesso'
    })
})

test('Vaga nao encontrada', async () => {
    await server.ready()

    const { token } = await authenticationUser('manager')

    const result = request(server.server)
    .delete('/vagas/18')
    .set('Authorization', token)

    expect((await result).status).toEqual(404)
    expect((await result).body).toEqual({
        error: 'Vaga nao encontrada'
    })
})
