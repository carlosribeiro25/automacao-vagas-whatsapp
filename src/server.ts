import { server } from './app.js'
import { startWhatsappWorker } from './modules/whatsaap/whatsaap.worker.js'
startWhatsappWorker()

server.listen({ port: 3333, host: '0.0.0.0' }).then(() => {
  console.log('HTTP server running http://localhost:3333/ ')
})
