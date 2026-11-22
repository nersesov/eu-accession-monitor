// pnpm seed — ролі, адміністратор (ADMIN_EMAIL/ADMIN_PASSWORD) і демонстраційні дані. Можна перезапускати.
import config from '@payload-config'
import { getPayload } from 'payload'
import { ensureAdmin, ensureRoles, seedDemo } from './index'

const payload = await getPayload({ config })
await ensureRoles(payload)
await ensureAdmin(payload)
await seedDemo(payload, { force: true })
console.log('Seed завершено')
process.exit(0)
