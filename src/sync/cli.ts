// pnpm migrate:sheets — перенесення даних із Google Sheets (або data/sheets/*.csv). Можна перезапускати.
import config from '@payload-config'
import { getPayload } from 'payload'
import { runSync } from './run'

const payload = await getPayload({ config })
const run = await runSync(payload, { trigger: 'cli' })
console.log(JSON.stringify({ source: run.source, created: run.created, updated: run.updated, unchanged: run.unchanged, skipped: run.skipped, errors: run.errors }, null, 2))
process.exit(Array.isArray(run.errors) && run.errors.length ? 1 : 0)
