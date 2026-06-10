import { db } from '../../db/index.js';
import { users, passwordResetTokens } from '../../db/schema.js';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import z from 'zod';
import { sendResetEmail } from '../../services/email.service.js';
import { hash } from 'argon2';
export const forgotPassword = async (server) => {
    server.post('/forgot-password', {
        schema: {
            tags: ['Users'],
            summary: 'Endpoint para recuperar senha',
            body: z.object({ email: z.email() }),
            response: { 200: z.object({ message: z.string() }) },
        },
    }, async (request, reply) => {
        const { email } = request.body;
        const user = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
        if (user.length === 0) {
            return reply
                .status(200)
                .send({ message: 'Se o email existir, voce receberar as instrucoes' });
        }
        const token = randomBytes(16).toString('hex');
        const expiresAt = new Date(Date.now() + 1000 * 60 * 15);
        await db.insert(passwordResetTokens).values({
            userId: user[0].id,
            token,
            expiresAt,
        });
        await sendResetEmail(email, token);
        return reply
            .status(200)
            .send({ message: 'Se o email existir, voce receberar as instrucoes' });
    });
};
export const resetPassword = async (server) => {
    server.post('/reset-password', {
        schema: {
            tags: ['Users'],
            summary: 'Endpoint para criar nova senha',
            body: z.object({
                token: z.string(),
                newPassword: z.string().min(6),
            }),
            response: {
                200: z.object({ message: z.string() }),
                400: z.object({ error: z.string() }),
            },
        },
    }, async (request, reply) => {
        const { token, newPassword } = request.body;
        const record = await db
            .select()
            .from(passwordResetTokens)
            .where(and(eq(passwordResetTokens.token, token), isNull(passwordResetTokens.useAt), gt(passwordResetTokens.expiresAt, new Date())))
            .limit(1);
        if (record.length === 0) {
            return reply.status(400).send({ error: 'Token invalido ou expirado' });
        }
        const hashed = await hash(newPassword);
        await db
            .update(users)
            .set({ password: hashed })
            .where(eq(users.id, record[0].userId));
        await db
            .update(passwordResetTokens)
            .set({ useAt: new Date() })
            .where(eq(passwordResetTokens.id, record[0].id));
        return reply.status(200).send({ message: 'Senha redefinida com sucesso' });
    });
};
