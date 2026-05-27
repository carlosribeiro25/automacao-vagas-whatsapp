import fs from 'fs';
import path from 'path';
import { extractJobDataFromImage } from './vision.service.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '@/db/index.js';
import { vagas } from '@/db/schema.js';

export async function testVisionController(request: FastifyRequest, reply: FastifyReply) {
    const data = await request.file()

    if (!data) {
        return reply.status(400).send({ error: 'Imagem obrigatoria' })
    }

    const uploadDir = path.resolve('uploads')

    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir)
    }
    // caminha imagem
    const filePath = path.join(
        uploadDir,
        data.filename
    )

    // salva imagem
    const buffer = await data.toBuffer()

    fs.writeFileSync(filePath, buffer)

    // Chama A ia
    const result = await extractJobDataFromImage(
        filePath
    )

    // Ignora se nao for vaga
    if (!result?.is_job) {
        return reply.send({
            success: false,
            message: 'Não é vaga'
        })
    }

    // Salva no banco
    await db.insert(vagas).values({
        title: result.title,

        message: result.messagem,

        tipo_vaga: result.tipo_vaga,

        description: result.description,

        category: result.category,

        company: result.company,

        texto_extraido:
            result.texto_extraido,

        requirements:
            result.requirements,

        modality: result.modality,

        salary: result.salary
            ? String(result.salary)
            : null,

        benefits: result.benefits,

        group_name:
            result.group_name,

        contact: result.contact,

        link: result.link,

        location: result.location,

        imagem_original_url: filePath,
    })

    return reply.send({
        success: true,
        data: result
    })
}
