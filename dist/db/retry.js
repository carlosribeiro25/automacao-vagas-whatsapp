const RETRIABLE_DB_ERROR_PATTERN =
  /fetch failed|und_err_socket|other side closed|socket|econnreset|etimedout|eai_again|error connecting to database/i
export async function withDbRetry(operation, options = {}) {
  const maxAttempts = options.maxAttempts ?? 3
  const delayMs = options.delayMs ?? 300
  let lastError
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt === maxAttempts || !isRetriableDbError(error)) {
        throw error
      }
      await wait(delayMs * attempt)
    }
  }
  throw lastError
}
function isRetriableDbError(error) {
  const message = error instanceof Error ? error.message : String(error)
  return RETRIABLE_DB_ERROR_PATTERN.test(message)
}
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
