import {integer, pgTable, text, timestamp ,check, numeric, boolean} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'; 

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  picture: text("picture"),
  password: text("password").notNull(),
  creatAt: timestamp({ withTimezone: true }).defaultNow()
}, (table) => [
  check('users_name_length_check', sql`length(${table.name}) >= 4`),
]);

export const vagas = pgTable('vagas', {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title"),
  messagem: text("mensagem"),
  tipo_vaga: text("tipo_vaga"),
  description: text("description"),
  category: text("category"),
  company: text("company"),
  texto_extraido: text("texto_extraido"),
  imagem_original_url: text("imagem_original_url"),
  requirements: text("requirements"),
  modality: text("modality"),
  salary: numeric("salary"),
  benefits: text("benefits"),
  group: text("group"),
  contact: text("contact"),
  link: text("link"),
  location: text("location"),
  publishAt: timestamp({ withTimezone: true }).defaultNow()
})

export const grupos_Whatsapp =  pgTable('grupos_Whatsaap', {
  id:  integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  whatsaapId: integer("whatsaapId").unique().notNull(),
  description: text("description"),
  active: boolean("active").default(true),
  creatAt: timestamp({withTimezone: true}).defaultNow(),
  updateAt: timestamp({withTimezone: true}).defaultNow()
})

export const mensagens = pgTable('mensagens', {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  grupoId: integer("grupo_id").references(() => grupos_Whatsapp.id),
  autor: text(),
  conteudo: text(),
  data: timestamp(),
  imagem_url: text(),
  created_at: timestamp()
})





