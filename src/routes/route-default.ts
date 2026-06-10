import { FastifyInstance } from 'fastify'

export async function routeDefault(app: FastifyInstance) {
  app.get('/', (request, reply) => {
    return reply
      .status(200)
      .send({ message: 'Nossa api esta em funcionamento' })
  })
}

export async function health(app: FastifyInstance) {
  app.get('/health', (request, reply) => {
    return reply
      .status(200)
      .send({ status: 'Nossa api esta em produção.' })
  })
}
