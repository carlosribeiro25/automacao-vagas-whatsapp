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
  customType,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
export const modalityEnum = pgEnum('modality', [
  'Remoto',
  'Hibrido',
  'Presencial',
  'Home Office',
])
export const roleEnum = pgEnum('user_role', ['manager', 'user'])
export const whatsappConnectionStatusEnum = pgEnum(
  'whatsapp_connection_status',
  ['pending', 'qr_ready', 'authenticated', 'ready', 'disconnected', 'failed'],
)
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
    updateAt: timestamp({ withTimezone: true }).defaultNow(),
    role: roleEnum().default('user'),
  },
  (table) => [
    check('users_name_length_check', sql`length(${table.name}) >= 4`),
  ],
)
export const vagas = pgTable(
  'vagas',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    connectionId: integer('connection_id').references(
      () => whatsapp_connections.id,
    ),
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
    search_vector: customType({
      dataType() {
        return 'tsvector'
      },
    })('search_vector'),
  },
  (table) => [
    index('vagas_connection_idx').on(table.connectionId),
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
    connectionId: integer('connection_id').references(
      () => whatsapp_connections.id,
    ),
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
    index('mensagens_connection_idx').on(table.connectionId),
    index('mensagens_processed_idx').on(table.processed),
    index('mensagens_is_job_idx').on(table.is_job),
  ],
)
export const passwordResetTokens = pgTable('passwordResetTokens', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  useAt: timestamp('used_at', { withTimezone: true }),
})
export const whatsapp_connections = pgTable(
  'whatsapp_connections',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    status: whatsappConnectionStatusEnum('status').notNull().default('pending'),
    phone: text('phone'),
    clientKey: text('client_key').notNull().unique(),
    sessionKey: text('session_key'),
    lastQr: text('last_qr'),
    lastQrAt: timestamp('last_qr_at', { withTimezone: true }),
    connectedAt: timestamp('connected_at', { withTimezone: true }),
    disconnectedAt: timestamp('disconnected_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updateAt: timestamp('update_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('whatsapp_connections_user_idx').on(table.userId),
    index('whatsapp_connections_status_idx').on(table.status),
  ],
)
export const whatsapp_connection_groups = pgTable(
  'whatsapp_connection_groups',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    connectionId: integer('connection_id')
      .references(() => whatsapp_connections.id)
      .notNull(),
    groupId: integer('group_id')
      .references(() => grupos_whatsapp.id)
      .notNull(),
    selected: boolean('selected').default(false),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updateAt: timestamp('update_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('whatsapp_connection_groups_connection_idx').on(table.connectionId),
    index('whatsapp_connection_groups_selected_idx').on(table.selected),
    uniqueIndex('whatsapp_connection_groups_connection_group_unique').on(
      table.connectionId,
      table.groupId,
    ),
  ],
)
