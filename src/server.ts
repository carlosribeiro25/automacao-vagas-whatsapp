import { fastify } from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { fastifyCors } from '@fastify/cors'
import { fastifySwagger } from '@fastify/swagger'
import ScalarApiReference from '@scalar/fastify-api-reference'

const server = fastify({
  logger: true,
}).withTypeProvider<ZodTypeProvider>()

server.setValidatorCompiler(validatorCompiler)
server.setSerializerCompiler(serializerCompiler)

server.register(fastifyCors, {
  origin: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
})

server.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'Sistema de filtros de vagas do Whatsapp',
      version: '1.0.0',
    },
  },

  transform: jsonSchemaTransform,
})

server.register(ScalarApiReference, {
  routePrefix: '/docs',
})

server.get('/', () => {
  return 'Hello world!'
})

server.listen({ port: 3333, host: '0.0.0.0' }).then(() => {
  console.log('HTTP server running http://localhost:3333/ ')
})
