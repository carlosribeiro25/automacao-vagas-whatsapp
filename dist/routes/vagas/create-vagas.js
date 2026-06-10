import { db } from '@/db/index.js';
import { vagas } from '@/db/schema.js';
import z from 'zod';
export const createVagas = async (server) => {
    server.post('/register', {
        schema: {
            tags: ['Vagas'],
            summary: 'Endpoint paraa cadastrar vagas',
            body: z.object({
                title: z.string().nullish(),
                message: z.string().nullish(),
                mensagemId: z.coerce.number().nullish(),
                tipo_vaga: z.string().nullish(),
                description: z.string().nullish(),
                category: z.string().nullish(),
                company: z.string().nullish(),
                texto_extraido: z.string().nullish(),
                imagem_original_url: z.string().nullish(),
                requirements: z.string().nullish(),
                modality: z
                    .enum(['Remoto', 'Hibrido', 'Presencial', 'Home Office'])
                    .nullish(),
                salary: z.coerce.number().nullish(),
                benefits: z.string().nullish(),
                group_name: z.string().nullish(),
                contact: z.string().nullish(),
                link: z.string().nullish(),
                location: z.string().nullish(),
                is_job: z.boolean(),
            }),
            response: {
                201: z.object({
                    message: z.string(),
                    vagaId: z.coerce.number(),
                }),
                400: z.object({ error: z.string() }),
            },
        },
    }, async (request, reply) => {
        const { title, message, mensagemId, tipo_vaga, description, category, company, texto_extraido, imagem_original_url, requirements, modality, salary, benefits, group_name, contact, link, location, is_job, } = request.body;
        try {
            const insertVagas = await db
                .insert(vagas)
                .values({
                title,
                message,
                mensagemId,
                tipo_vaga,
                description,
                category,
                company,
                texto_extraido,
                imagem_original_url,
                requirements,
                modality,
                salary: salary !== null && salary !== undefined ? String(salary) : null,
                benefits,
                group_name,
                contact,
                link,
                location,
                is_job,
            })
                .returning({ id: vagas.id });
            return reply.status(201).send({
                message: 'Vaga cadastrada com sucesso',
                vagaId: insertVagas[0].id,
            });
        }
        catch (error) {
            console.error('Erro ao cadastrar vaga:', error);
            return reply
                .status(400)
                .send({ error: 'Dados inválidos ou malformados' });
        }
    });
};
