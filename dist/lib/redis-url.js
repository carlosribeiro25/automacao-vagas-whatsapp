/**
 * Upstash requires TLS (`rediss://`) but is sometimes stored as `redis://` by mistake.
 * Redis Cloud Free tier endpoints (*.db.redis.io) do NOT use TLS on their default port.
 * This helper only normalizes known TLS-required providers.
 */
function shouldForceTls(hostname) {
    return (hostname.endsWith('.upstash.io') ||
        hostname.endsWith('.upstash.com'));
}
export function normalizeRedisUrl(rawUrl) {
    try {
        const parsed = new URL(rawUrl);
        if (parsed.protocol === 'redis:' && shouldForceTls(parsed.hostname)) {
            parsed.protocol = 'rediss:';
            return parsed.toString();
        }
        return rawUrl;
    }
    catch {
        return rawUrl;
    }
}
