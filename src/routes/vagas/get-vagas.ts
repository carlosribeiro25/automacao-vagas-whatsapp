import { db } from "@/db/index.js";
import { vagas } from "@/db/schema.js";
import { and, eq, SQL } from "drizzle-orm";
import { FastifyInstance } from "fastify";
import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export async function getVagas(app: FastifyInstance) {
    app.get('/vagas', {
        schema: {
            tags: ['Vagas'],
            summary: 'Essa rota lista todas as vagas',
            response: {
                200: z.object({ vagas: z.array(z.any())}),
                404: z.object({ error: z.string()})
            }
        }

    }, async (request, reply) => {

        const result = await db
            .select()
            .from(vagas)

        if (!result || result.length === 0) {
            return reply.status(404).send({ error: 'Nenhuma vaga encontrada' })
        }

        return reply.status(200).send({ vagas: result })
    })
}

export const getVagasFilters: FastifyPluginAsyncZod = async (app) => {
    app.get('/vagas/filtros', {
        schema: {
            tags: ['Vagas'],
            summary: 'Essa rota filtra as vagas por categoria.',
            querystring: z.object({
                category: z.string().nullish(),
                modality: z.enum(['Remoto', 'Hibrido', 'Presencial', 'Home Office']).nullish(),
                tipo_vaga: z.string().nullish(),
                location: z.string().nullish(),
                publisheAt: z.string().nullish()
            }),
            response: {
                200: z.object({ vagas: z.array(z.any())}),
                404: z.object({ error: z.string()})
            }
            
        }
    }, async (request, reply) => {

        const { category, modality, tipo_vaga, location, publisheAt } = request.query

        const filters: SQL[] = []

        if(category) filters.push(eq(vagas.category, category))
        if(modality) filters.push(eq(vagas.modality, modality))
        if(tipo_vaga) filters.push(eq(vagas.tipo_vaga, tipo_vaga))
        if(location) filters.push(eq(vagas.location, location))
        if(publisheAt) filters.push(eq(vagas.publisheAt, new Date(publisheAt)))

        const resultFilter = await db
        .select()
        .from(vagas)
        .where(and(...filters))

        if(!resultFilter || resultFilter.length === 0) {
            return reply.status(404).send({ error: 'Nenhuma vaga encontrada com o filtro aplicado'})
        }

        return reply.status(200).send({ vagas: resultFilter})

    })
}