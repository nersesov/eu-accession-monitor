// Журнал аудиту: afterChange/afterDelete додаються до всіх колекцій функцією withAudit().
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionConfig, PayloadRequest } from 'payload'

export const AUDIT_SLUG = 'audit-log'
const SECRET_KEYS = new Set(['password', 'hash', 'salt', 'resetPasswordToken', 'resetPasswordExpiration', 'sessions', 'lockUntil', 'loginAttempts'])

function sanitize(doc: unknown): unknown {
  if (!doc || typeof doc !== 'object') return doc ?? null
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(doc as Record<string, unknown>)) {
    if (!SECRET_KEYS.has(k)) out[k] = v
  }
  return JSON.parse(JSON.stringify(out))
}

async function write(
  req: PayloadRequest,
  entry: { action: 'create' | 'update' | 'delete'; collectionSlug: string; docId: string; before: unknown; after: unknown },
) {
  try {
    await req.payload.create({
      collection: AUDIT_SLUG,
      data: {
        ...entry,
        userId: req.user ? String(req.user.id) : null,
        userEmail: (req.user as { email?: string } | null)?.email ?? 'system',
        at: new Date().toISOString(),
      } as any,
      overrideAccess: true,
      req,
    })
  } catch (err) {
    req.payload.logger.error({ err, msg: 'audit-log write failed' })
    throw err // зміна без запису в журналі не допускається — транзакція відкотиться
  }
}

export function withAudit(collection: CollectionConfig): CollectionConfig {
  if (collection.slug === AUDIT_SLUG) return collection

  const afterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
    await write(req, {
      action: operation,
      collectionSlug: collection.slug,
      docId: String(doc.id),
      before: operation === 'create' ? null : sanitize(previousDoc),
      after: sanitize(doc),
    })
    return doc
  }

  const afterDelete: CollectionAfterDeleteHook = async ({ doc, id, req }) => {
    await write(req, { action: 'delete', collectionSlug: collection.slug, docId: String(id), before: sanitize(doc), after: null })
    return doc
  }

  return {
    ...collection,
    hooks: {
      ...collection.hooks,
      afterChange: [...(collection.hooks?.afterChange ?? []), afterChange],
      afterDelete: [...(collection.hooks?.afterDelete ?? []), afterDelete],
    },
  }
}
