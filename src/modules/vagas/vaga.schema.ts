import z from 'zod'

export const vagaSchema = z.object({
  is_job: z.boolean(),

  title: z.string().nullable(),

  messagem: z.string().nullable(),

  tipo_vaga: z.string().nullable(),

  description: z.string().nullable(),

  category: z.string().nullable(),

  company: z.string().nullable(),

  texto_extraido: z.string().nullable(),

  requirements: z.string().nullable(),

  modality: z
    .enum(['Remoto', 'Hibrido', 'Presencial', 'Home Office'])
    .nullable(),

  salary: z.coerce.number().nullable(),

  benefits: z.string().nullable(),

  group_name: z.string().nullable(),

  contact: z.string().nullable(),

  link: z.string().nullable(),

  location: z.string().nullable(),
})
