import { fastify } from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { fastifyCors } from '@fastify/cors'
import fastifyCookie from '@fastify/cookie'
import { fastifySwagger } from '@fastify/swagger'
import ScalarApiReference from '@scalar/fastify-api-reference'
import { routeDefault } from './routes/route-default.js'
import {
  getSearch,
  getVagas,
  getVagasFilters,
} from './routes/vagas/get-vagas.js'
import { createVagas } from './routes/vagas/create-vagas.js'
import { deleteVagas } from './routes/vagas/delete-vagas.js'
import { getVagasbyId } from './routes/vagas/get-vagaById.js'
import fastifyMultipart from '@fastify/multipart'
import { visionRoutes } from './modules/vision/vision.routes.js'
import { registerUser } from './routes/Users/create-user.js'
import { updateUser } from './routes/Users/update-user.js'
import { authRouter } from './routes/login.js'
import { refreshToken } from './routes/refresh.js'
import {
  forgotPassword,
  resetPassword,
} from './routes/Users/forgot-password.js'
import { routeLogout } from './routes/logout.js'

const server = fastify({
  logger: true,
}).withTypeProvider<ZodTypeProvider>()

server.setValidatorCompiler(validatorCompiler)
server.setSerializerCompiler(serializerCompiler)

server.register(fastifyCors, {
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
})

server.register(fastifyCookie)

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
server.register(getVagasbyId)
server.register(getVagasFilters)
server.register(getSearch)
server.register(fastifyMultipart, {
  limits: {
    fileSize: 10_000_000,
  },
})
server.register(visionRoutes)

server.register(registerUser)
server.register(updateUser)
server.register(authRouter)
server.register(refreshToken)
server.register(resetPassword)
server.register(forgotPassword)
server.register(routeLogout)

export { server }
