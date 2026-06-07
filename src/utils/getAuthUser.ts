import { FastifyRequest } from "fastify"
export function getAuthUserReq(request: FastifyRequest) {
    const user = request.user

    if(!user) {
        throw new Error('Invalid autentication')
    }

    return user
}