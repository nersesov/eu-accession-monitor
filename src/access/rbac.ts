// Єдина access-функція для всіх колекцій. Права зберігаються в даних (колекція `roles`):
// матриця { [collectionSlug]: { read, write, delete } }. Нова колекція отримує права через UI ролей —
// цей файл змінювати не потрібно.
import type { Access, CollectionConfig, PayloadRequest, Where } from 'payload'

export type Action = 'read' | 'write' | 'delete'
export type Permission = Partial<Record<Action, boolean>>
export type PermissionMatrix = Record<string, Permission>

export const ADMIN_ROLE = 'admin'

type RoleLike = { id: number | string; name?: string; permissions?: PermissionMatrix | null }

export function can(role: RoleLike | null | undefined, slug: string, action: Action): boolean {
  if (!role) return false
  if (role.name === ADMIN_ROLE) return true
  return Boolean(role.permissions?.[slug]?.[action])
}

/** Роль поточного користувача (з кешем у межах запиту). */
export async function resolveRole(req: PayloadRequest): Promise<RoleLike | null> {
  const user = req.user as { role?: RoleLike | number | string | null } | null
  if (!user?.role) return null
  if (typeof user.role === 'object') return user.role
  const cache = req.context as { __role?: RoleLike | null }
  if (cache.__role !== undefined) return cache.__role
  try {
    cache.__role = (await req.payload.findByID({ collection: 'roles', id: user.role, depth: 0, overrideAccess: true })) as RoleLike
  } catch {
    cache.__role = null
  }
  return cache.__role
}

export async function userCan(req: PayloadRequest, slug: string, action: Action): Promise<boolean> {
  return can(await resolveRole(req), slug, action)
}

type Options = {
  /** Анонімне читання (публічний контент). */
  publicRead?: boolean
  /** Для колекцій із чернетками: анонімні користувачі бачать лише опубліковане. */
  drafts?: boolean
  /** Користувач завжди може прочитати власний запис (потрібно для `users`). */
  selfRead?: boolean
}

export function rbac(slug: string, opts: Options = {}): NonNullable<CollectionConfig['access']> {
  const check =
    (action: Action): Access =>
    async ({ req }) =>
      userCan(req, slug, action)

  const read: Access = async ({ req }) => {
    if (req.user) {
      if (await userCan(req, slug, 'read')) return true
      if (opts.selfRead) return { id: { equals: req.user.id } } as Where
    }
    if (opts.publicRead) {
      return opts.drafts ? ({ _status: { equals: 'published' } } as Where) : true
    }
    return false
  }

  return {
    read,
    create: check('write'),
    update: check('write'),
    delete: check('delete'),
    readVersions: check('write'),
  }
}
