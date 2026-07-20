import { db } from '@/db/index.js'
import { withDbRetry } from '@/db/retry.js'
import { vagas } from '@/db/schema.js'
import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  gte,
  ilike,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { checkAutentication } from '../hooks/check-request-jwt.js'

export const getVagas: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/vagas',
    {
      preHandler: [checkAutentication],
      schema: {
        tags: ['Vagas'],
        summary: 'Essa rota lista todas as vagas',
        querystring: z.object({
          page: z.coerce.number().default(1),
          limit: z.coerce.number().default(10),
        }),

        response: {
          200: z.object({
            vagas: z.array(z.any()),
            hasMore: z.boolean(),
            total: z.coerce.number(),
            page: z.coerce.number(),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { page, limit } = request.query

      const [{ total }] = await withDbRetry(() =>
        db.select({ total: count() }).from(vagas).execute(),
      )

      const result = await withDbRetry(() =>
        db
          .select()
          .from(vagas)
          .orderBy(desc(vagas.publisheAt))
          .limit(limit)
          .offset((page - 1) * limit)
          .execute(),
      )

      if (!result || result.length === 0) {
        return reply.status(404).send({ error: 'Nenhuma vaga encontrada' })
      }

      return reply.status(200).send({
        vagas: result,
        hasMore: page * limit < total,
        total,
        page,
      })
    },
  )
}

export const getVagasFilters: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/vagas/filtros',
    {
      preHandler: [checkAutentication],
      schema: {
        tags: ['Vagas'],
        summary: 'Essa rota filtra as vagas por categoria.',
        querystring: z.object({
          page: z.coerce.number().min(1).default(1),
          limit: z.coerce.number().min(1).max(100).default(6),
          category: z.string().nullish(),
          modality: z
            .enum(['Remoto', 'Hibrido', 'Presencial', 'Home Office'])
            .nullish(),
          city: z.string().optional(),
          state: z
            .string()
            .length(2)
            .transform((v) => v.toUpperCase())
            .optional(),
          location: z.string().optional(),
          tipo_vaga: z.string().nullish(),
          publisheAt: z.coerce.date().nullish(),
        }),

        response: {
          200: z.object({
            vagas: z.array(z.any()),
            hasMore: z.boolean(),
            total: z.coerce.number(),
            page: z.coerce.number(),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const {
        page,
        limit,
        category,
        modality,
        tipo_vaga,
        publisheAt,
        city,
        state,
        location,
      } = request.query

      const filters: SQL[] = []

      if (category) filters.push(ilike(vagas.category, `%${category}%`))
      if (modality) filters.push(eq(vagas.modality, modality))
      if (tipo_vaga) filters.push(ilike(vagas.tipo_vaga, `%${tipo_vaga}%`))
      if (city) {
        filters.push(ilike(vagas.city, `%${city}%`))
      }
      if (state) {
        filters.push(eq(vagas.state, state))
      }
      if (location?.trim()) {
        const local = `%${location.trim()}%`
        const locationFilter = or(
          ilike(vagas.location, local),
          ilike(vagas.city, local),
        )

        if (locationFilter) {
          filters.push(locationFilter)
        }
      }

      if (publisheAt) {
        const start = new Date(publisheAt)
        start.setUTCHours(0, 0, 0, 0)
        const end = new Date(publisheAt)
        end.setUTCHours(23, 59, 59, 999)
        filters.push(gte(vagas.publisheAt, start))
        filters.push(lte(vagas.publisheAt, end))
      }

      const whereClause = filters.length > 0 ? and(...filters) : undefined

      const [{ total }] = await withDbRetry(() =>
        whereClause
          ? db
              .select({ total: count() })
              .from(vagas)
              .where(whereClause)
              .execute()
          : db.select({ total: count() }).from(vagas).execute(),
      )

      const resultFilter = await withDbRetry(() =>
        whereClause
          ? db
              .select()
              .from(vagas)
              .where(whereClause)
              .limit(limit)
              .offset((page - 1) * limit)
              .orderBy(desc(vagas.publisheAt))
              .execute()
          : db
              .select()
              .from(vagas)
              .limit(limit)
              .offset((page - 1) * limit)
              .orderBy(desc(vagas.publisheAt))
              .execute(),
      )

      if (!resultFilter || resultFilter.length === 0) {
        return reply
          .status(404)
          .send({ error: 'Nenhuma vaga encontrada com o filtro aplicado' })
      }

      return reply.status(200).send({
        vagas: resultFilter,
        hasMore: page * limit < total,
        total,
        page,
      })
    },
  )
}

export const getSearch: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/search',
    {
      preHandler: [checkAutentication],
      schema: {
        tags: ['Vagas'],
        summary: 'Endpoint para  pesquisa de Vagas',
        querystring: z.object({
          q: z.string().trim().min(1),
          page: z.coerce.number().min(1).default(1),
          limit: z.coerce.number().min(1).max(100).default(10),
        }),
        response: {
          200: z.object({
            vagas: z.array(
              z.object({
                id: z.coerce.number(),
                title: z.string().nullish(),
                tipo_vaga: z.string().nullish(),
                description: z.string().nullish(),
                category: z.string().nullish(),
                company: z.string().nullish(),
                requirements: z.string().nullish(),
                modality: z
                  .enum(['Remoto', 'Hibrido', 'Presencial', 'Home Office'])
                  .nullish(),
                salary: z.coerce.number().nullish(),
                benefits: z.string().nullish(),
                contact: z.string().nullish(),
                link: z.string().nullish(),
                location: z.string().nullish(),
                publisheAt: z.date().nullish(),
              }),
            ),
            total: z.number(),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { q, page, limit } = request.query

      const cleanQ = q.replace(/\bvagas?\b/gi, '').trim()
      const searchTerm = cleanQ || q

      const tsQuery = sql`plainto_tsquery('portuguese', ${searchTerm})`

      const keywords = searchTerm.split(/\s+/).filter((w) => w.length >= 3)

      const ilikeParts = keywords.map(
        (kw) => sql`(
          ${vagas.title} ILIKE ${'%' + kw + '%'} OR
          ${vagas.description} ILIKE ${'%' + kw + '%'} OR
          ${vagas.requirements} ILIKE ${'%' + kw + '%'} OR
          ${vagas.category} ILIKE ${'%' + kw + '%'} OR
          ${vagas.tipo_vaga} ILIKE ${'%' + kw + '%'}
        )`,
      )

      const whereClause =
        ilikeParts.length > 0
          ? sql`search_vector @@ ${tsQuery} OR (${sql.join(ilikeParts, sql` AND `)})`
          : sql`search_vector @@ ${tsQuery}`

      const [{ total }] = await withDbRetry(() =>
        db.select({ total: count() }).from(vagas).where(whereClause).execute(),
      )

      const resultSearch = await withDbRetry(() =>
        db
          .select({
            ...getTableColumns(vagas),
            rank: sql<number>`ts_rank(search_vector, ${tsQuery})`,
          })
          .from(vagas)
          .where(whereClause)
          .orderBy(sql`ts_rank(search_vector, ${tsQuery}) DESC`)
          .limit(limit)
          .offset((page - 1) * limit)
          .execute(),
      )

      if (!resultSearch || resultSearch.length === 0) {
        return reply
          .status(404)
          .send({ error: 'Nenhuma vaga encontrada para a pesquisa' })
      }

      return reply.status(200).send({ vagas: resultSearch, total })
    },
  )
}
