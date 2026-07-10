import { describe, expect, it } from 'vitest'
import { withDbRetry } from '../src/db/retry'

describe('withDbRetry', () => {
  it('retries transient database errors until the operation succeeds', async () => {
    let attempts = 0

    const result = await withDbRetry(
      async () => {
        attempts += 1
        if (attempts < 3) {
          throw new TypeError('fetch failed')
        }

        return 'ok'
      },
      { maxAttempts: 3, delayMs: 0 },
    )

    expect(result).toBe('ok')
    expect(attempts).toBe(3)
  })

  it('stops retrying once the error is not transient', async () => {
    let attempts = 0

    await expect(
      withDbRetry(
        async () => {
          attempts += 1
          throw new Error('invalid SQL')
        },
        { maxAttempts: 3, delayMs: 0 },
      ),
    ).rejects.toThrow('invalid SQL')

    expect(attempts).toBe(1)
  })
})
