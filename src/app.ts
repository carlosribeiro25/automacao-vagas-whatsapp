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
import { routeDefault } from './routes/route-default.js'
import { getVagas } from './routes/vagas/get-vagas.js'
import { createVagas } from './routes/vagas/create-vagas.js'
import { deleteVagas } from './routes/vagas/delete-vagas.js'

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

server.register(routeDefault)
server.register(getVagas)
server.register(createVagas)
server.register(deleteVagas)

export { server }