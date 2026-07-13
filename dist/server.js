import { server } from './app.js'
import { startProcessor } from './modules/whatsapp/whatsapp.processor.js'
// Global safety net: prevent WhatsApp-web.js auth timeouts and other transient
// rejections from crashing the Node process. Fly.io would restart the machine
// on exit code 1, causing unnecessary downtime.
process.on('unhandledRejection', (reason) => {
  console.error('[Process] unhandledRejection:', reason)
})
process.on('uncaughtException', (error) => {
  console.error('[Process] uncaughtException:', error)
})
startProcessor()
const port = Number(process.env.PORT) || 3333
server.listen({ port, host: '0.0.0.0' }).then(() => {
  console.log('HTTP server running http://localhost:3333/')
})
