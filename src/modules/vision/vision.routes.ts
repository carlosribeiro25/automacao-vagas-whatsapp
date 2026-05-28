import { FastifyInstance } from 'fastify'
import { testVisionController } from '@/modules/vision/vision.controller.js'

export async function visionRoutes(app: FastifyInstance) {
  app.post('/vision/test', testVisionController)
}
