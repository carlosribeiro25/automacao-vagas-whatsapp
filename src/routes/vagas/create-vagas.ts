;
import { server } from "@/app.js";
import { db } from "@/db/index.js";
import { vagas } from "@/db/schema.js";
import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export const createVagas: FastifyPluginAsyncZod = async (server) => {
    server.post('/register', {
        schema: {
            tags: ['Vagas'],
            summary: 'Endpoint paraa cadastrar vagas',
            body: z.object({
                title: z.string().nullable(),
                message: z.string().nullable(),
                mensagemId: z.coerce.number().nullable(),
                tipo_vaga: z.string().nullable(),
                description: z.string().nullable(),
                category: z.string().nullable(),
                company: z.string().nullable(),
                texto_extraido: z.string().nullable(),
                imagem_original_url: z.string().nullable(),
                requirements: z.string().nullable(),
                modality: z.enum(['Remoto', 'Hibrido', 'Presencial', 'Home Office']).nullable(),
                salary: z.coerce.number(),
                benefits: z.string().nullable(),
                group_name: z.string().nullable(),
                contact: z.string().nullable(),
                link: z.string().nullable(),
                location: z.string().nullable(),
                is_job: z.boolean(),
            })
        }

    }, async (request, reply) => {

        const { title, message, mensagemId, tipo_vaga, description, category, company, texto_extraido, imagem_original_url, requirements,
            modality, salary, benefits, group_name, contact, link, location, is_job, 
        } = request.body

        try {

            const insertVagas = await db.insert(vagas).values({
            title, message, mensagemId, tipo_vaga, description, category, company, texto_extraido, imagem_original_url, requirements,
            modality, salary: salary !== null && salary !== undefined ? String(salary) : null,
            benefits, group_name, contact, link, location, is_job, 

        }).returning({ id: vagas.id })

        return reply.status(201).send({ message: 'Vaga cadastrada com sucesso', vagaId: insertVagas[0].id })
            
        } catch (error) {
            console.error('Erro ao cadastrar vaga:', error)
            return reply.status(400).send({ error: 'Erro ao cadastrar uma vaga'})
        }

    })
}




