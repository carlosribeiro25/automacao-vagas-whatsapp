import fs from 'fs'
import path from 'path'
import { uploadImagemCloudinary } from '@/services/cloudinary/cloudinary.service.js'
import { extractJobDataFromImage } from './vision.service.js'
import { FastifyRequest, FastifyReply } from 'fastify'
import { db } from '@/db/index.js'
import { vagas } from '@/db/schema.js'

export async function testVisionController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const data = await request.file()

  if (!data) {
    return reply.status(400).send({ error: 'Imagem obrigatoria' })
  }

  const uploadDir = path.resolve('uploads')

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir)
  }

  const filePath = path.join(uploadDir, data.filename)

  const buffer = await data.toBuffer()
  fs.writeFileSync(filePath, buffer)

  const cloudinaryUrl = await uploadImagemCloudinary(filePath)
  fs.unlinkSync(filePath)

  const result = await extractJobDataFromImage(cloudinaryUrl)

  if (!result?.is_job) {
    return reply.send({
      success: false,
      message: 'Não é vaga',
    })
  }

  await db.insert(vagas).values({
    title: result.title,

    message: result.messagem,

    tipo_vaga: result.tipo_vaga,

    description: result.description,

    category: result.category,

    company: result.company,

    texto_extraido: result.texto_extraido,

    requirements: result.requirements,

    modality: result.modality as
      | 'Remoto'
      | 'Hibrido'
      | 'Presencial'
      | 'Home Office'
      | null,

    salary: result.salary ? String(result.salary) : null,

    benefits: result.benefits,

    group_name: result.group_name,

    contact: result.contact,

    link: result.link,

    location: result.location,

    imagem_original_url: cloudinaryUrl,
  })

  return reply.send({
    success: true,
    data: result,
  })
}
