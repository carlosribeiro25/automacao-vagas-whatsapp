import { db } from "@/db/index.js";
import { users } from "@/db/schema.js";
import { eq } from "drizzle-orm";
import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export const updateUser: FastifyPluginAsyncZod = async (server) => {
    server.put('/updateUser/:id',{
        schema: {
            params: z.object({
                id: z.coerce.number()
            }),
            body: z.object({
                email: z.email(),
                password: z.string(),
                phone: z.string(),
                picture: z.string()
            })
        }
    } , async ( request, reply) => {

        const { id } = request.params
        const { email, password, phone, picture } = request.body

        try {
            const updated = await db
            .update(users)
            .set({ email, password, phone, picture })
            .where(eq(users.id, id))
            .returning({ id: users.id })

            if(updated.length === 0) {
                return reply.status(404).send({ error: 'Usuario nao encontrado'})
            }

            return reply.status(200).send({ message: 'Cadastro atualizado com sucesso'})

        } catch (error: any) {
            const emailExist = [error?.code, error?.cause?.code].includes('23505')

            return reply.status(emailExist ? 409 : 400).send({ error: emailExist ? 'Email ja esta cadastrado' : 'Dados inválidos ou malformados'})
            
        }
    })
}