import { redisConnection } from '../lib/redis.js'
export const routeLogout = async (app) => {
  app.post('/logout', async (request, reply) => {
    const refreshToken = request.cookies.refreshToken
    if (refreshToken) {
      try {
        await redisConnection.del(`refresh:${refreshToken}`)
      } catch (error) {
        request.log.error(
          { error },
          'Falha ao remover refresh token no Redis durante logout',
        )
        return reply
          .status(503)
          .send({ error: 'Serviço de sessão temporariamente indisponível.' })
      }
    }
    reply.clearCookie('refreshToken', { path: '/' })
    return reply.status(204).send()
  })
}
