import { getAuthUserReq } from '@/utils/getAuthUser.js'
import type { FastifyRequest, FastifyReply } from 'fastify'

export function checkUserRole(role: 'manager' | 'user') {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const user = getAuthUserReq(request)

    if (user.role !== role) {
      return reply.status(401).send()
    }
  }
}
