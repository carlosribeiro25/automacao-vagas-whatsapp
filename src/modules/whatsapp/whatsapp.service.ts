import fs from 'fs'
import path from 'path'
import { db } from '@/db/index.js'
import { grupos_whatsapp, mensagens, vagas } from '@/db/schema.js'
import { eq } from 'drizzle-orm'
import {
  extractJobDataFromImage,
  extractJobDataFromText,
} from '@/modules/vision/vision.service.js'
import { uploadImagemCloudinary } from '@/services/cloudinary/cloudinary.service.js'
import z from 'zod'

type ModalityEnum = 'Remoto' | 'Hibrido' | 'Presencial' | 'Home Office'

export function normalizeModality(value: string | null): ModalityEnum | null {
  if (!value) return null
  const normalized = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (normalized.includes('remoto')) return 'Remoto'
  if (normalized.includes('hibrido') || normalized.includes('hybrid'))
    return 'Hibrido'
  if (normalized.includes('home office')) return 'Home Office'
  if (normalized.includes('presencial')) return 'Presencial'
  return null
}

export async function processarMensagemWhatsapp(dados: unknown) {
  const dataSchema = z.object({
    grupoWappId: z.string(),
    grupoNome: z.string(),
    autor: z.string(),
    conteudo: z.string(),
    imagemBuffer: z.instanceof(Buffer).nullable(),
    imagemNome: z.string().nullable(),
    dataMensagem: z.date(),
  })

  const data = dataSchema.parse(dados)

  let grupo = await db
    .select()
    .from(grupos_whatsapp)
    .where(eq(grupos_whatsapp.whatsaapId, data.grupoWappId))
    .then((r) => r[0])

  if (!grupo) {
    const inserted = await db
      .insert(grupos_whatsapp)
      .values({
        name: data.grupoNome,
        whatsaapId: data.grupoWappId,
      })
      .onConflictDoNothing()
      .returning()
    grupo =
      inserted[0] ??
      (await db
        .select()
        .from(grupos_whatsapp)
        .where(eq(grupos_whatsapp.whatsaapId, data.grupoWappId))
        .then((r) => r[0]))
  }

  let imagemUrl: string | null = null
  let cloudinaryUrl: string | null = null

  if (data.imagemBuffer && data.imagemNome) {
    const uploadDir = path.resolve('uploads')

    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir)
    imagemUrl = path.join(uploadDir, data.imagemNome)
    fs.writeFileSync(imagemUrl, data.imagemBuffer)
    cloudinaryUrl = await uploadImagemCloudinary(imagemUrl)
  }

  const [mensagem] = await db
    .insert(mensagens)
    .values({
      grupoId: grupo.id,
      autor: data.autor,
      conteudo: data.conteudo,
      tipo_mensagem: data.imagemBuffer ? 'imagem' : 'texto',
      imagem_url: imagemUrl,
      data: data.dataMensagem,
    })
    .returning()

  let result = null

  if (imagemUrl) {
    result = await extractJobDataFromImage(imagemUrl)
    fs.unlinkSync(imagemUrl)
  } else if (data.conteudo?.trim()) {
    result = await extractJobDataFromText(data.conteudo)
  }

  if (result === null) return

  await db
    .update(mensagens)
    .set({ processed: true, is_job: result?.is_job ?? false })
    .where(eq(mensagens.id, mensagem.id))

  if (!result?.is_job) return

  await db.insert(vagas).values({
    mensagemId: mensagem.id,
    title: result.title,
    message: result.messagem,
    tipo_vaga: result.tipo_vaga,
    description: result.description,
    category: result.category,
    company: result.company,
    texto_extraido: result.texto_extraido,
    imagem_original_url: cloudinaryUrl,
    requirements: result.requirements,
    modality: normalizeModality(result.modality),
    salary: result.salary ? String(result.salary) : null,
    benefits: result.benefits,
    group_name: data.grupoNome,
    contact: result.contact,
    link: result.link,
    location: result.location,
    is_job: true,
    processed_by_ai: true,
  })
}
