import { server } from './app.js'
import { startProcessor } from './modules/whatsapp/whatsapp.processor.js'

startProcessor()

const port = Number(process.env.PORT) || 3333

server.listen({ port, host: '0.0.0.0' }).then(() => {
  console.log('HTTP server running http://localhost:3333/')
})
