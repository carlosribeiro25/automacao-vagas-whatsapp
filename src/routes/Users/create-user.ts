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
            }),

            response: {
                201: z.object({ message: z.string(), usersId: z.number(), name: z.string(), email: z.string(), phone: z.string(), password: z.string() }),
                400: z.object({ error: z.string()}),
                409: z.object({ duplicate: z.string()})
            }
        }
    }, async (request, reply) => {

        const { name, email, phone, password } = request.body

        try {
            const createUser = await db
            .insert(users)
            .values({ name, email, phone, password })
            .returning()

            reply.status(201).send({ message: 'Usuario cadastrado com sucesso', usersId: createUser[0].id, name: createUser[0].name, email: createUser[0].email, phone: createUser[0].phone, password: createUser[0].password })

        } catch (error: any) {
            const duplicate = [error?.code, error?.cause?.code].includes('23505')
            if (duplicate) {
                return reply.status(409).send({ duplicate: 'Email ja esta cadastrado' })
            }
            return reply.status(400).send({ error: 'Dados inválidos ou malformados' })
        }
    })
}