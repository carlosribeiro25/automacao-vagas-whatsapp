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
