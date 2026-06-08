import { db } from '@/db/index.js'
import { users } from '@/db/schema.js'
import { hash } from 'argon2'
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

export const registerUser: FastifyPluginAsyncZod = async (server) => {
  server.post(
    '/registerUser',
    {
      schema: {
        body: z.object({
          name: z.string(),
          email: z.email(),
          phone: z.string(),
          password: z.string().min(6),
          role: z.enum(['manager', 'user']).default('user').optional(),
        }),

        response: {
          201: z.object({
            message: z.string(),
            usersId: z.coerce.number(),
          }),
          400: z.object({ error: z.string() }),
          409: z.object({ duplicate: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { name, email, phone, password, role } = request.body

      try {
        const hashPassword = await hash(password)

        const createUser = await db
          .insert(users)
          .values({ name, email, phone, password: hashPassword, role })
          .returning({ id: users.id })

        reply.status(201).send({
          message: 'Usuario cadastrado com sucesso',
          usersId: createUser[0].id,
        })
      } catch (error: any) {
        const duplicate = [error?.code, error?.cause?.code].includes('23505')
        if (duplicate) {
          return reply
            .status(409)
            .send({ duplicate: 'Email ja esta cadastrado' })
        }
        return reply
          .status(400)
          .send({ error: 'Dados inválidos ou malformados' })
      }
    },
  )
}
