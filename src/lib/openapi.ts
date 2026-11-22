// Специфікація OpenAPI 3.1 відкритого API. Із неї ж будується сторінка документації /api-docs.
import { RATE_LIMIT } from './api'
import { siteUrl } from './format'

const localeParam = { name: 'locale', in: 'query', required: false, description: 'Мова відповіді / Response language', schema: { type: 'string', enum: ['uk', 'en'], default: 'uk' } }
const statusEnum = ['not_started', 'in_progress', 'done', 'partial']
const displayEnum = [...statusEnum, 'overdue']
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })
const ok = (schema: object, description = 'OK') => ({
  '200': { description, content: { 'application/json': { schema } } },
  '429': { description: 'Too many requests', content: { 'application/json': { schema: ref('Error') } } },
})

export function openapi() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Reform Monitor: Chapters 23 and 24 — Open API',
      version: '1.0.0',
      description: `Публічний API лише для читання. Демонстраційні дані. Обмеження: ${RATE_LIMIT} запитів на хвилину з однієї адреси.\n\nPublic read-only API. Demonstration data. Rate limit: ${RATE_LIMIT} requests per minute per address.`,
      license: { name: 'MIT', identifier: 'MIT' },
    },
    servers: [{ url: `${siteUrl()}/api/v1` }],
    paths: {
      '/progress': {
        get: {
          operationId: 'getProgress',
          summary: 'Загальний прогрес, прогрес глав і напрямів / Overall, chapter and direction progress',
          parameters: [localeParam],
          responses: ok(ref('ProgressResponse')),
        },
      },
      '/chapters': {
        get: {
          operationId: 'listChapters',
          summary: 'Глави з напрямами / Chapters with their directions',
          parameters: [localeParam],
          responses: ok({ type: 'object', properties: { data: { type: 'array', items: ref('Chapter') } }, required: ['data'] }),
        },
      },
      '/directions/{slug}': {
        get: {
          operationId: 'getDirection',
          summary: 'Напрям з орієнтирами та заходами / Direction with benchmarks and measures',
          parameters: [{ name: 'slug', in: 'path', required: true, description: 'Slug напряму, напр. sudova-reforma / Direction slug', schema: { type: 'string' }, example: 'sudova-reforma' }, localeParam],
          responses: { ...ok(ref('DirectionDetail')), '404': { description: 'Not found', content: { 'application/json': { schema: ref('Error') } } } },
        },
      },
      '/measures': {
        get: {
          operationId: 'listMeasures',
          summary: 'Заходи з фільтрами / Measures with filters',
          parameters: [
            { name: 'status', in: 'query', required: false, description: 'Статус (overdue — обчислюваний) / Status (overdue is computed)', schema: { type: 'string', enum: displayEnum } },
            { name: 'direction', in: 'query', required: false, description: 'Slug напряму / Direction slug', schema: { type: 'string' } },
            localeParam,
          ],
          responses: { ...ok({ type: 'object', properties: { total: { type: 'integer' }, data: { type: 'array', items: ref('Measure') } }, required: ['total', 'data'] }), '400': { description: 'Bad request', content: { 'application/json': { schema: ref('Error') } } } },
        },
      },
      '/updates': {
        get: {
          operationId: 'listUpdates',
          summary: 'Оновлення статусів / Status updates',
          parameters: [
            { name: 'since', in: 'query', required: false, description: 'Лише оновлення від цієї дати (ISO 8601) / Only updates since this date', schema: { type: 'string', format: 'date' }, example: '2026-09-01' },
            localeParam,
          ],
          responses: { ...ok({ type: 'object', properties: { total: { type: 'integer' }, data: { type: 'array', items: ref('StatusUpdate') } }, required: ['total', 'data'] }), '400': { description: 'Bad request', content: { 'application/json': { schema: ref('Error') } } } },
        },
      },
    },
    components: {
      schemas: {
        Error: { type: 'object', properties: { error: { type: 'object', properties: { status: { type: 'integer' }, message: { type: 'string' } }, required: ['status', 'message'] } }, required: ['error'] },
        Progress: {
          type: 'object',
          description: 'percent = round(score / total × 100); done = 1, partial = 0.5',
          properties: {
            total: { type: 'integer' },
            percent: { type: 'integer', minimum: 0, maximum: 100 },
            score: { type: 'number' },
            counts: { type: 'object', properties: Object.fromEntries(displayEnum.map((s) => [s, { type: 'integer' }])) },
          },
          required: ['total', 'percent', 'score', 'counts'],
        },
        DirectionSummary: {
          type: 'object',
          properties: { slug: { type: 'string' }, title: { type: 'string' }, chapter: { type: 'integer' }, progress: ref('Progress') },
          required: ['slug', 'title', 'chapter', 'progress'],
        },
        Chapter: {
          type: 'object',
          properties: {
            number: { type: 'integer' }, title: { type: 'string' }, description: { type: ['string', 'null'] }, progress: ref('Progress'),
            directions: { type: 'array', items: ref('DirectionSummary') },
          },
          required: ['number', 'title', 'progress', 'directions'],
        },
        ProgressResponse: {
          type: 'object',
          properties: {
            generatedAt: { type: 'string', format: 'date-time' },
            overall: ref('Progress'),
            chapters: { type: 'array', items: { type: 'object', properties: { number: { type: 'integer' }, title: { type: 'string' }, progress: ref('Progress') } } },
            directions: { type: 'array', items: ref('DirectionSummary') },
          },
          required: ['generatedAt', 'overall', 'chapters', 'directions'],
        },
        Measure: {
          type: 'object',
          properties: {
            id: { type: 'integer' }, externalId: { type: ['string', 'null'] }, title: { type: 'string' },
            status: { type: 'string', enum: statusEnum }, displayStatus: { type: 'string', enum: displayEnum },
            deadline: { type: ['string', 'null'], format: 'date-time' }, responsibleBody: { type: ['string', 'null'] },
            evidenceLinks: { type: 'array', items: { type: 'object', properties: { label: { type: ['string', 'null'] }, url: { type: 'string' } } } },
            notes: { type: ['string', 'null'] }, tags: { type: 'array', items: { type: 'string' } },
            benchmark: { type: 'string' }, direction: { type: 'string' }, chapter: { type: 'integer' }, url: { type: 'string' },
          },
          required: ['id', 'title', 'status', 'displayStatus', 'benchmark', 'direction', 'chapter'],
        },
        Benchmark: {
          type: 'object',
          properties: {
            code: { type: 'string' }, text: { type: 'string' },
            source: { type: 'object', properties: { title: { type: ['string', 'null'] }, url: { type: ['string', 'null'] } } },
            progress: ref('Progress'), measures: { type: 'array', items: ref('Measure') },
          },
          required: ['code', 'text', 'progress', 'measures'],
        },
        DirectionDetail: {
          type: 'object',
          properties: {
            slug: { type: 'string' }, title: { type: 'string' }, description: { type: ['string', 'null'] }, chapter: { type: 'integer' },
            progress: ref('Progress'), benchmarks: { type: 'array', items: ref('Benchmark') },
          },
          required: ['slug', 'title', 'chapter', 'progress', 'benchmarks'],
        },
        StatusUpdate: {
          type: 'object',
          properties: {
            id: { type: 'integer' }, date: { type: 'string', format: 'date-time' },
            fromStatus: { type: ['string', 'null'], enum: [...statusEnum, null] }, toStatus: { type: 'string', enum: statusEnum },
            comment: { type: ['string', 'null'] }, source: { type: ['string', 'null'] },
            measure: { type: 'object', properties: { id: { type: 'integer' }, title: { type: 'string' } } },
          },
          required: ['id', 'date', 'toStatus', 'measure'],
        },
      },
    },
  }
}
