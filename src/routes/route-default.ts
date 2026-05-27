import { FastifyInstance } from "fastify";

export async function routeDefault(app: FastifyInstance) {
    app.get('/', (request, reply) => {
        return reply.status(200).send({ message: 'Nossa api esta em funcionamento'})
    } )
}

