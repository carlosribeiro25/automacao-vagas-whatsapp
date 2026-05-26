import { db } from "@/db/index.js";
import { vagas } from "@/db/schema.js";
import { FastifyInstance } from "fastify";

export async function getVagas(app: FastifyInstance) {
    app.get('/vagas', {
        schema: {
            tags: ['Vagas'],
            summary: 'Essa rota lista todas as vagas'
        }

    }, async (request, reply) => {

        const result = await db
            .select()
            .from(vagas)

        if (!result || result.length === 0) {
            return reply.status(404).send({ message: 'Nenhuma vaga encontrada' })
        }

        return reply.status(200).send({ vagas: result })
    })
}