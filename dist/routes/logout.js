import { redisConnection } from '@/lib/redis.js';
export const routeLogout = async (app) => {
    app.post('/logout', async (request, reply) => {
        const refreshToken = request.cookies.refreshToken;
        if (refreshToken) {
            await redisConnection.del(`refresh:${refreshToken}`);
        }
        reply.clearCookie('refreshToken', { path: '/' });
        return reply.status(204).send();
    });
};
