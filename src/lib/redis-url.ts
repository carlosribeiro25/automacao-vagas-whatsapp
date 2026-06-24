function shouldForceTls(hostname: string): boolean {
  return (
    hostname.endsWith('.upstash.io') ||
    hostname.endsWith('.upstash.com')
  )
}

export function normalizeRedisUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl)

    if (parsed.protocol === 'redis:' && shouldForceTls(parsed.hostname)) {
      parsed.protocol = 'rediss:'
      return parsed.toString()
    }

    return rawUrl
  } catch {
    return rawUrl
  }
}
