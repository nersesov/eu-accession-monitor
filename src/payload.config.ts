import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { en } from '@payloadcms/translations/languages/en'
import { uk } from '@payloadcms/translations/languages/uk'
import { buildConfig, type CollectionConfig } from 'payload'
import sharp from 'sharp'
import { Benchmarks, Chapters, Directions, Measures, StatusUpdates } from './collections/content'
import { Media, News, Pages, Redirects } from './collections/site'
import { AuditLog, buildRoles, SyncRuns, Users } from './collections/system'
import { withAudit } from './hooks/audit'
import { migrations } from './migrations'
import { bootstrap } from './seed'
import { runSync } from './sync/run'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// Щоб додати колекцію — достатньо дописати її сюди. Права на неї призначаються в UI ролей,
// аудит підключається автоматично (withAudit), механізм прав не змінюється.
const base: CollectionConfig[] = [Chapters, Directions, Benchmarks, Measures, StatusUpdates, Pages, News, Media, Redirects, Users, AuditLog, SyncRuns]

const labelOf = (c: CollectionConfig): string => {
  const plural = c.labels?.plural
  return plural && typeof plural === 'object' ? ((plural as Record<string, string>).uk ?? c.slug) : typeof plural === 'string' ? plural : c.slug
}
const matrixRows = [...base.map((c) => ({ slug: c.slug, label: labelOf(c) })), { slug: 'roles', label: 'Ролі' }]

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: process.env.SITE_URL || undefined,
  admin: {
    user: 'users',
    importMap: { baseDir: dirname },
    meta: { titleSuffix: ' — Монітор реформ' },
    dateFormat: 'dd.MM.yyyy HH:mm',
    // Без Gravatar: адреси користувачів не передаються стороннім сервісам
    avatar: 'default',
  },
  collections: [...base, buildRoles(matrixRows)].map(withAudit),
  editor: lexicalEditor(),
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI || '' },
    migrationDir: path.resolve(dirname, 'migrations'),
    // Схема змінюється лише міграціями; у production вони виконуються при старті застосунку.
    push: false,
    prodMigrations: migrations,
  }),
  localization: {
    locales: [
      { code: 'uk', label: 'Українська' },
      { code: 'en', label: 'English' },
    ],
    defaultLocale: 'uk',
    fallback: true,
  },
  i18n: { supportedLanguages: { uk, en }, fallbackLanguage: 'uk' },
  graphQL: { disable: true },
  sharp,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  telemetry: false,
  // У production — структуровані JSON-логи (pino) у stdout; у розробці — зручний для читання формат.
  ...(process.env.NODE_ENV === 'production' ? { logger: { options: { level: process.env.LOG_LEVEL || 'info' } } } : {}),
  jobs: {
    tasks: [
      {
        slug: 'syncSheets',
        label: 'Синхронізація з Google Sheets',
        handler: async ({ req }) => {
          const run = await runSync(req.payload, { trigger: 'schedule' })
          return { output: { runId: run.id } }
        },
        // Щодня о 03:00 завдання ставиться в чергу `nightly`
        schedule: [{ cron: '0 3 * * *', queue: 'nightly' }],
      },
    ],
    autoRun: [{ cron: '*/5 * * * *', queue: 'nightly', limit: 1 }],
    shouldAutoRun: () => process.env.ENABLE_JOBS !== 'false',
  },
  onInit: async (payload) => {
    if (process.env.NEXT_PHASE === 'phase-production-build') return
    await bootstrap(payload)
  },
})
