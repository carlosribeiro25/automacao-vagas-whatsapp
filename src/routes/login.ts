import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { users } from '@/db/schema.js'
import { db } from '@/db/index.js'
import { eq } from 'drizzle-orm'
import { verify } from 'argon2'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { redisConnection } from '@/lib/redis.js'

export const authRouter: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Autenticação do usário com login',
        body: z.object({
          email: z.email().trim(),
          password: z.string().min(1),
        }),
        response: {
          200: z.object({
            token: z.string(),
            user: z.object({
              id: z.number(),
              name: z.string().nullable(),
              email: z.email().nullable(),
              phone: z.string().nullable(),
              picture: z.string().nullable(),
            }),
          }),
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body

      const result = await db.select().from(users).where(eq(users.email, email))

      if (result.length === 0) {
        return reply.status(400).send({
          error:
            'Credencias inválidas, verifique se o email ou senha estao corretos.',
        })
      }

      const user = result[0]

      let verifyPassword = false

      try {
        verifyPassword = await verify(user.password, password)
      } catch {
        return reply.status(400).send({
          error:
            'Credencias inválidas, verifique se o email ou senha estao corretos.',
        })
      }

      if (!verifyPassword) {
        return reply.status(400).send({
          error:
            'Credencias inválidas, verifique se o email ou senha estao corretos.',
        })
      }

      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET precisa ser setado.')
      }

      const token = jwt.sign(
        { sub: user.id, role: user.role },
        process.env.JWT_SECRET,
        {
          expiresIn: '30m',
        },
      )

      const refreshToken = randomUUID()
      const TTL_7_DAYS = 60 * 60 * 24 * 7

      await redisConnection.set(
        `refresh:${refreshToken}`,
        user.id,
        'EX',
        TTL_7_DAYS,
      )

      const isProd = process.env.NODE_ENV === 'production'

      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: TTL_7_DAYS,
      })

      return reply.status(200).send({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          picture: user.picture ?? null,
        },
      })
    },
  )
}
