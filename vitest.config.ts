import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    coverage: {
     enabled: true,
     provider: 'v8',
     reporter: ['text','text-summary', 'html'],
     include: ['src/**/*.ts'],
     exclude: ['**/*/test.ts', 'src/tests/**'],
    },
  },
})
