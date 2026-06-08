import { server } from './app.js'
import { startProcessor } from './modules/whatsapp/whatsapp.processor.js'

startProcessor()

server.listen({ port: 3333, host: '0.0.0.0' }).then(() => {
  console.log('HTTP server running http://localhost:3333/')
})
