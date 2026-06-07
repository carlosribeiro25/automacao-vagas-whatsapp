import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";
import { users } from "@/db/schema.js";
import { db } from "@/db/index.js";
import { eq } from "drizzle-orm";
import { verify } from "argon2";
import jwt from 'jsonwebtoken'

export const authRouter: FastifyPluginAsyncZod = async (app) => {
    app.post('/login', {
        schema: {
            tags: ['Auth'],
            summary: 'Autenticação do usário com login',
            body: z.object({
                email: z.email(),
                password: z.string()
            }),
            response: {
                200: z.object({ token: z.string()}),
                400: z.object({ error: z.string()})
            }
        }
    }, async (request, reply) => {
       const { email, password } = request.body 

       const result = await db.select()
       .from(users)
       .where(eq(users.email, email))

       if (result.length === 0)  {
        return reply.status(400).send({ error: 'Credencias inválidas, verifique se o email ou senha estao corretos.'})
       }

       const user = result[0]

       const verifyPassword = await verify(user.password, password)

       if (!verifyPassword) {
        return reply.status(400).send({ error: 'Credencias inválidas, verifique se o email ou senha estao corretos.'})
       }

       if(!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET precisa ser setado.')
       }

       const token = jwt.sign({ sub: user.id, role: user.role}, process.env.JWT_SECRET)

       return reply.status(200).send({ token })
       
    } )
}