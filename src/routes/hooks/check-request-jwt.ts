import type { FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'

type JwtPayload = {
  sub: string
  role: 'manager' | 'user'
}

export async function checkAutentication(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  
  const cookieToken = request.cookies?.accessToken
  const authHeader = request.headers.authorization
  const headerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader

  const token = cookieToken ?? headerToken

  if (!token) {
    return reply.status(401).send({ error: 'Nao autorizado' })
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET precisa ser setado.')
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload
    request.user = payload
  } catch (error) {
    return reply.status(401).send({ error: 'Nao autorizado' })
  }
}
