import { getAuthUserReq } from '@/utils/getAuthUser.js';
export function checkUserRole(role) {
    return async function (request, reply) {
        const user = getAuthUserReq(request);
        if (user.role !== role) {
            return reply.status(401).send();
        }
    };
}
