import {
  integer,
  pgTable,
  text,
  timestamp,
  check,
  numeric,
  boolean,
  index,
  pgEnum,
  customType
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const modalityEnum = pgEnum('modality', [
  'Remoto',
  'Hibrido',
  'Presencial',
  'Home Office',
])

export const users = pgTable(
  'users',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    phone: text('phone').notNull(),
    picture: text('picture'),
    password: text('password').notNull(),
    creatAt: timestamp({ withTimezone: true }).defaultNow(),
  },
  (table) => [
    check('users_name_length_check', sql`length(${table.name}) >= 4`),
  ],
)

export const vagas = pgTable(
  'vagas',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    title: text('title'),
    message: text('message'),
    mensagemId: integer('mensagem_id').references(() => mensagens.id),
    tipo_vaga: text('tipo_vaga'),
    description: text('description'),
    category: text('category'),
    company: text('company'),
    texto_extraido: text('texto_extraido'),
    imagem_original_url: text('imagem_original_url'),
    requirements: text('requirements'),
    modality: modalityEnum('modality'),
    salary: numeric('salary', { precision: 10, scale: 2 }),
    benefits: text('benefits'),
    group_name: text('group_name'),
    contact: text('contact'),
    link: text('link'),
    location: text('location'),
    is_job: boolean('is_job').default(true),
    processed_by_ai: boolean('processed_by_ai').default(false),
    publisheAt: timestamp('published_at').defaultNow(),
    search_vector: customType< {data: string}> ({
      dataType() { return 'tsvector' }
    })('search_vector'),
  },
  (table) => [
    index('vagas_category_idx').on(table.category),
    index('vagas_location_idx').on(table.location),
  ],
)

export const grupos_whatsapp = pgTable(
  'grupos_Whatsaap',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    name: text('name').notNull(),
    whatsaapId: text('whatsaapId').unique().notNull(),
    description: text('description'),
    active: boolean('active').default(true),
    creatAt: timestamp({ withTimezone: true }).defaultNow(),
    updateAt: timestamp({ withTimezone: true }).defaultNow(),
  },
  (table) => [index('grupos_whatsapp_active_idx').on(table.active)],
)

export const mensagens = pgTable(
  'mensagens',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    grupoId: integer('grupo_id').references(() => grupos_whatsapp.id),
    autor: text('autor'),
    conteudo: text('conteudo'),
    tipo_mensagem: text('tipo_mensagem'),
    imagem_url: text('imagem_url'),
    processed: boolean('processed').default(false),
    is_job: boolean('is_job'),
    data: timestamp('data'),
    created_at: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('mensagens_processed_idx').on(table.processed),
    index('mensagens_is_job_idx').on(table.is_job),
  ],
)
