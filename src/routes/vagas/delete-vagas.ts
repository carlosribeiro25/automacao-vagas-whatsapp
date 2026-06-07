import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { db } from '@/db/index.js'
import { vagas } from '@/db/schema.js'
import { eq } from 'drizzle-orm'
import { checkAutentication } from '../hooks/check-request-jwt.js'
import { checkUserRole } from '../hooks/check-use-role.js'

export const deleteVagas: FastifyPluginAsyncZod = async (server) => {
  server.delete(
    '/vagas/:id',
    {
      preHandler: [checkAutentication, checkUserRole('manager')],
      schema: {
        tags: ['Vagas'],
        summary: 'Endpoint para deletar uma vaga',

        params: z.object({
          id: z.coerce.number(),
        }),
        response: {
          200: z.object({ message: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params

      const deleteVaga = await db
        .delete(vagas)
        .where(eq(vagas.id, id))
        .returning()

      if (deleteVaga.length > 0) {
        return reply.status(200).send({ message: 'Vaga deletada com sucesso' })
      } else {
        return reply.status(404).send({ error: 'Vaga nao encontrada' })
      }
    },
  )
}
