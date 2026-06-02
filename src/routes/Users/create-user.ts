import { db } from "@/db/index.js";
import { users } from "@/db/schema.js";
import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export const registerUser: FastifyPluginAsyncZod = async (server) => {
    server.post('/registerUser', {
        schema: {
            body: z.object({
                name: z.string(),
                email: z.email(),
                phone: z.string(),
                password: z.string(),
                picture: z.string().nullable()
            }),

            response: {
                201: z.object({ message: z.string(), usersId: z.number()}),
                400: z.object({ error: z.string()}),
                409: z.object({ duplicate: z.string()})
            }
        }
    }, async (request, reply) => {

        const { name, email, phone, password, picture } = request.body

        try {
            const createUser = await db
            .insert(users)
            .values({ name, email, phone, password, picture })
            .returning({id: users.id})

            reply.status(201).send({ message: 'Usuario cadastrado com sucesso', usersId: createUser[0].id })

        } catch (error: any) {
            const duplicate = [error?.code, error?.cause?.code].includes('23505')
            return reply.status(duplicate ? 409 : 400).send({ error: duplicate ? 'Email ja esta cadastrado' : 'Dados inválidos ou malformados'})
        }
    })
}