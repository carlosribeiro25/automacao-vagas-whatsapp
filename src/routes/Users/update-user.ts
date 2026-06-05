import { db } from '@/db/index.js'
import { users } from '@/db/schema.js'
import { eq } from 'drizzle-orm'
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

export const updateUser: FastifyPluginAsyncZod = async (server) => {
  server.patch(
    '/updateUser/:id',
    {
      schema: {
        params: z.object({
          id: z.coerce.number(),
        }),
        body: z.object({
          email: z.email().optional(),
          password: z.string().optional(),
          phone: z.string().optional(),
        }).refine(
          (data) => Object.keys(data).length > 0,
          { message: 'Informe ao menos um campo para atualizar' }
        ),
        response: {
          200: z.object({ message: z.string() }),
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
          409: z.object({ emailExist: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params
      const { email, password, phone } = request.body

      // Monta o objeto só com os campos enviados pelo cliente
      const fields = {
        ...(email !== undefined && { email }),
        ...(password !== undefined && { password }),
        ...(phone !== undefined && { phone }),
      }

      try {
        const updated = await db
          .update(users)
          .set(fields)
          .where(eq(users.id, id))
          .returning({ id: users.id })

        if (updated.length === 0) {
          return reply.status(404).send({ error: 'Usuario nao encontrado' })
        }

        return reply
          .status(200)
          .send({ message: 'Usuario atualizado com sucesso' })
      } catch (error: any) {
        const emailExist = [error?.code, error?.cause?.code].includes('23505')

        if (emailExist) {
          return reply
            .status(409)
            .send({ emailExist: 'Email ja esta cadastrado' })
        }
        return reply
          .status(400)
          .send({ error: 'Dados inválidos ou malformados' })
      }
    },
  )
}
