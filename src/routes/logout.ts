import { redisConnection } from "@/lib/redis.js";
import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export const routeLogout: FastifyPluginAsyncZod = async (app) => {
    app.post('/logout', async (request, reply) => {
        const refreshToken = request.cookies.refreshToken

        if (refreshToken) {
            await redisConnection.del(`refresh:${refreshToken}`)
        }

        reply.clearCookie('refreshToken', { path: '/' })
        return reply.status(204).send()
    })
}