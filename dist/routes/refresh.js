import { redisConnection } from '../lib/redis.js';
import z from 'zod';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
export const refreshToken = async (app) => {
    app.post('/refresh', {
        schema: {
            response: {
                200: z.object({ accessToken: z.string() }),
                401: z.object({ error: z.string() }),
                503: z.object({ error: z.string() }),
            },
        },
    }, async (request, reply) => {
        const refreshToken = request.cookies.refreshToken;
        if (!refreshToken) {
            return reply
                .status(401)
                .send({ error: 'Refresh token inválido ou expirado.' });
        }
        let userId = null;
        try {
            userId = await redisConnection.get(`refresh:${refreshToken}`);
        }
        catch (error) {
            request.log.error({ error }, 'Falha ao consultar refresh token no Redis');
            return reply
                .status(503)
                .send({ error: 'Serviço de sessão temporariamente indisponível.' });
        }
        if (!userId) {
            return reply
                .status(401)
                .send({ error: 'Refresh token inválido ou expirado.' });
        }
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET precisa ser setado.');
        }
        const newAccessToken = jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
            expiresIn: '30m',
        });
        try {
            await redisConnection.del(`refresh:${refreshToken}`);
        }
        catch (error) {
            request.log.error({ error }, 'Falha ao invalidar refresh token antigo no Redis');
            return reply
                .status(503)
                .send({ error: 'Serviço de sessão temporariamente indisponível.' });
        }
        const newRefreshToken = randomUUID();
        const TTL_7_DAYS = 60 * 60 * 24 * 7;
        try {
            await redisConnection.set(`refresh:${newRefreshToken}`, userId, 'EX', TTL_7_DAYS);
        }
        catch (error) {
            request.log.error({ error }, 'Falha ao salvar novo refresh token no Redis');
            return reply
                .status(503)
                .send({ error: 'Serviço de sessão temporariamente indisponível.' });
        }
        const isProd = process.env.NODE_ENV === 'production';
        reply.setCookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: 'lax',
            path: '/',
            maxAge: TTL_7_DAYS,
        });
        return reply.status(200).send({ accessToken: newAccessToken });
    });
};
