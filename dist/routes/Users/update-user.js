import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import z from 'zod';
import { checkAutentication } from '../hooks/check-request-jwt.js';
import { hash } from 'argon2';
export const updateUser = async (server) => {
    server.patch('/updateUser/:id', {
        preHandler: [checkAutentication],
        schema: {
            params: z.object({
                id: z.coerce.number(),
            }),
            body: z.object({
                email: z.email().optional(),
                password: z.string().optional(),
                phone: z.string().optional(),
                picture: z.string().optional(),
            }),
            response: {
                200: z.object({ message: z.string() }),
                400: z.object({ error: z.string() }),
                404: z.object({ error: z.string() }),
                409: z.object({ emailExist: z.string() }),
            },
        },
    }, async (request, reply) => {
        const { id } = request.params;
        const { email, password, phone, picture } = request.body;
        const updateData = {};
        if (email)
            updateData.email = email;
        if (phone)
            updateData.telefone = phone;
        if (picture)
            updateData.picture = picture;
        if (password) {
            const hashed = await hash(password);
            updateData.password = hashed;
        }
        try {
            const updated = await db
                .update(users)
                .set(updateData)
                .where(eq(users.id, id))
                .returning({ id: users.id });
            if (updated.length === 0) {
                return reply.status(404).send({ error: 'Usuario nao encontrado' });
            }
            return reply
                .status(200)
                .send({ message: 'Usuario atualizado com sucesso' });
        }
        catch (error) {
            const emailExist = [error?.code, error?.cause?.code].includes('23505');
            if (emailExist) {
                return reply
                    .status(409)
                    .send({ emailExist: 'Email ja esta cadastrado' });
            }
            return reply
                .status(400)
                .send({ error: 'Dados inválidos ou malformados' });
        }
    });
};
