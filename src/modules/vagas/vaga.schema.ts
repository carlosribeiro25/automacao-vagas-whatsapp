import z from "zod";


export const vagaSchema = z.object({

  title: z.string().nullable(),

  messagem: z.string().nullable(),

  tipo_vaga: z.string().nullable(),

  description: z.string().nullable(),

  category: z.string().nullable(),

  company: z.string().nullable(),

  texto_extraido: z.string().nullable(),

  requirements: z.string().nullable(),

  modality: z.string().nullable(),

  salary: z.number().nullable(),

  benefits: z.string().nullable(),

  group: z.string().nullable(),

  contact: z.string().nullable(),

  link: z.string().nullable(),

  location: z.string().nullable(),
})