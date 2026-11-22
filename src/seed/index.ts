// Початкове наповнення: системні ролі, перший адміністратор, демонстраційні дані.
import type { Payload } from 'payload'
import type { PermissionMatrix } from '../access/rbac'
import { runSync } from '../sync/run'
import { demoNews, demoPages } from './content'

const CONTENT = ['chapters', 'directions', 'benchmarks', 'measures', 'status-updates', 'pages', 'news', 'media', 'redirects']

export async function ensureRoles(payload: Payload) {
  const p = payload as any
  const slugs: string[] = payload.config.collections.map((c) => c.slug).filter((s) => !s.startsWith('payload-'))
  const full: PermissionMatrix = Object.fromEntries(slugs.map((s) => [s, { read: true, write: true, delete: true }]))
  const defaults = [
    { name: 'admin', description: 'Адміністратор: повний доступ (системна роль)', permissions: full },
    {
      name: 'editor',
      description: 'Редактор: керування контентом і запуск імпорту',
      permissions: {
        ...Object.fromEntries(CONTENT.map((s) => [s, { read: true, write: true, delete: true }])),
        'sync-runs': { read: true, write: true },
      },
    },
    {
      name: 'analyst',
      description: 'Аналітик: лише читання та експорт',
      permissions: Object.fromEntries(slugs.filter((s) => !['users', 'roles'].includes(s)).map((s) => [s, { read: true }])),
    },
  ]
  for (const role of defaults) {
    const { totalDocs } = await p.count({ collection: 'roles', where: { name: { equals: role.name } } })
    if (totalDocs === 0) {
      await p.create({ collection: 'roles', data: role })
      payload.logger.info({ msg: 'role created', role: role.name })
    }
  }
}

export async function ensureAdmin(payload: Payload) {
  const p = payload as any
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) return
  if ((await p.count({ collection: 'users' })).totalDocs > 0) return
  const role = (await p.find({ collection: 'roles', where: { name: { equals: 'admin' } }, limit: 1 })).docs[0]
  await p.create({ collection: 'users', data: { email, password, name: 'Administrator', role: role.id } })
  payload.logger.info({ msg: 'first admin created', email })
}

export async function seedDemo(payload: Payload, { force = false } = {}) {
  const p = payload as any
  if (!force && (await p.count({ collection: 'chapters' })).totalDocs > 0) return
  await runSync(payload, { trigger: 'seed' })

  for (const n of demoNews) {
    if ((await p.count({ collection: 'news', where: { slug: { equals: n.slug } } })).totalDocs > 0) continue
    const doc = await p.create({ collection: 'news', locale: 'uk', data: { slug: n.slug, date: n.date, ...n.uk, _status: 'published' } })
    await p.update({ collection: 'news', id: doc.id, locale: 'en', data: { ...n.en, _status: 'published' } })
  }
  for (const pg of demoPages) {
    if ((await p.count({ collection: 'pages', where: { slug: { equals: pg.slug } } })).totalDocs > 0) continue
    const doc = await p.create({ collection: 'pages', locale: 'uk', data: { slug: pg.slug, ...pg.uk, _status: 'published' } })
    await p.update({ collection: 'pages', id: doc.id, locale: 'en', data: { ...pg.en, _status: 'published' } })
  }
  if ((await p.count({ collection: 'redirects' })).totalDocs === 0) {
    await p.create({ collection: 'redirects', data: { from: '/about', to: '/pro-proiekt', type: '301' } })
    await p.create({ collection: 'redirects', data: { from: '/news', to: '/novyny', type: '302' } })
  }
  payload.logger.info({ msg: 'demo data seeded' })
}

export async function bootstrap(payload: Payload) {
  try {
    await ensureRoles(payload)
    await ensureAdmin(payload)
    if (process.env.SEED_ON_START === 'true') await seedDemo(payload)
  } catch (err) {
    payload.logger.error({ err, msg: 'bootstrap failed (чи виконано міграції? pnpm payload migrate)' })
  }
}
