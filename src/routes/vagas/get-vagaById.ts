import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { db } from '@/db/index.js'
import { vagas } from '@/db/schema.js'
import { eq } from 'drizzle-orm'

export const getVagasbyId: FastifyPluginAsyncZod = async (server) => {
  server.get(
    '/vagas/:id',
    {
      schema: {
        tags: ['Vagas'],
        summary: 'Endpoint para ler uma vaga pelo id',
        params: z.object({
          id: z.coerce.number(),
        }),

        response: {
          200: z.object({
            title: z.string().nullish(),
            message: z.string().nullish(),
            mensagemId: z.coerce.number().nullish(),
            tipo_vaga: z.string().nullish(),
            description: z.string().nullish(),
            category: z.string().nullish(),
            company: z.string().nullish(),
            texto_extraido: z.string().nullish(),
            imagem_original_url: z.string().nullish(),
            requirements: z.string().nullish(),
            modality: z
              .enum(['Remoto', 'Hibrido', 'Presencial', 'Home Office'])
              .nullish(),
            salary: z.coerce.number().nullish(),
            benefits: z.string().nullish(),
            group_name: z.string().nullish(),
            contact: z.string().nullish(),
            link: z.string().nullish(),
            location: z.string().nullish(),
            is_job: z.boolean().nullish(),
            publisheAt: z.date().nullish(),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params

      const [getvagasId] = await db.select().from(vagas).where(eq(vagas.id, id))

      if (!getvagasId) {
        return reply.status(404).send({ error: 'Vaga nao encontrada' })
      }

      return reply.status(200).send(getvagasId)
    },
  )
}
