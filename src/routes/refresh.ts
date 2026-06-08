import { redisConnection } from '@/lib/redis.js'
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'

export const refreshToken: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/refresh',
    {
      schema: {
        response: {
          200: z.object({ accessToken: z.string() }),
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const refreshToken = request.cookies.refreshToken

      if (!refreshToken) {
        return reply
          .status(401)
          .send({ error: 'Refresh token inválido ou expirado.' })
      }

      const userId = await redisConnection.get(`refresh:${refreshToken}`)

      if (!userId) {
        return reply
          .status(401)
          .send({ error: 'Refresh token inválido ou expirado.' })
      }

      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET precisa ser setado.')
      }

      const newAccessToken = jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
        expiresIn: '30m',
      })

      await redisConnection.del(`refresh:${refreshToken}`)

      const newRefreshToken = randomUUID()
      const TTL_7_DAYS = 60 * 60 * 24 * 7
      await redisConnection.set(
        `refresh:${newRefreshToken}`,
        userId,
        'EX',
        TTL_7_DAYS,
      )

      const isProd = process.env.NODE_ENV === 'production'

      reply.setCookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: TTL_7_DAYS,
      })

      return reply.status(200).send({ accessToken: newAccessToken })
    },
  )
}
