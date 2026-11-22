import config from '@payload-config'
import { getPayload } from 'payload'

export async function initPayload() {
  if (process.env.NEXT_PHASE === 'phase-production-build') return
  try {
    await getPayload({ config })
  } catch (err) {
    console.error(JSON.stringify({ level: 'error', msg: 'payload init failed', err: String(err) }))
  }
}
