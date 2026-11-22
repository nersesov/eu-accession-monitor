// Системні колекції: ролі, користувачі, журнал аудиту, запуски синхронізації.
import type { CollectionBeforeChangeHook, CollectionBeforeDeleteHook, CollectionConfig, PayloadRequest } from 'payload'
import { APIError } from 'payload'
import { ADMIN_ROLE, rbac, userCan } from '../access/rbac'
import { AUDIT_SLUG } from '../hooks/audit'
import { toCSV } from '../lib/csv'
import { L } from '../lib/labels'

const GROUP = L('Система', 'System')

/** Список колекцій для матриці прав передається з payload.config.ts — будується автоматично. */
export const buildRoles = (collections: { slug: string; label: string }[]): CollectionConfig => ({
  slug: 'roles',
  labels: { singular: L('Роль', 'Role'), plural: L('Ролі', 'Roles') },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'description'], group: GROUP },
  access: rbac('roles'),
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        if (originalDoc?.name === ADMIN_ROLE && data?.name && data.name !== ADMIN_ROLE) {
          throw new APIError('Системну роль admin не можна перейменувати.', 400)
        }
        return data
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        const role = await req.payload.findByID({ collection: 'roles', id, depth: 0, req })
        if (role.name === ADMIN_ROLE) throw new APIError('Системну роль admin не можна видалити.', 400)
        const { totalDocs } = await req.payload.count({ collection: 'users', where: { role: { equals: id } }, req })
        if (totalDocs > 0) throw new APIError('Роль призначена користувачам — спершу змініть їм роль.', 400)
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true, unique: true, index: true, label: L('Назва', 'Name') },
    { name: 'description', type: 'text', label: L('Опис', 'Description') },
    {
      name: 'permissions',
      type: 'json',
      label: L('Права доступу', 'Permissions'),
      defaultValue: {},
      admin: {
        description: L(
          'Матриця прав: читання / запис / видалення для кожної колекції. Роль admin завжди має повний доступ.',
          'Permission matrix: read / write / delete per collection. The admin role always has full access.',
        ),
        components: {
          Field: {
            path: '@/components/admin/PermissionsMatrix#PermissionsMatrix',
            clientProps: { collections },
          },
        },
      },
    },
  ],
})

async function adminRoleId(req: PayloadRequest): Promise<number | string | null> {
  const { docs } = await req.payload.find({ collection: 'roles', where: { name: { equals: ADMIN_ROLE } }, limit: 1, depth: 0, req })
  return docs[0]?.id ?? null
}

async function countOtherAdmins(req: PayloadRequest, exceptUserId: number | string): Promise<number> {
  const roleId = await adminRoleId(req)
  if (roleId === null) return 0
  const { totalDocs } = await req.payload.count({
    collection: 'users',
    where: { and: [{ role: { equals: roleId } }, { id: { not_equals: exceptUserId } }] },
    req,
  })
  return totalDocs
}

const relId = (v: unknown) => (v && typeof v === 'object' ? (v as { id: number | string }).id : (v as number | string | null | undefined))

const keepLastAdminOnDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const user = await req.payload.findByID({ collection: 'users', id, depth: 0, req })
  if (String(relId(user.role)) !== String(await adminRoleId(req))) return
  if ((await countOtherAdmins(req, id)) === 0) throw new APIError('Не можна видалити останнього адміністратора.', 400)
}

const keepLastAdminOnChange: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  if (operation !== 'update' || !originalDoc || data.role === undefined) return data
  const adminId = String(await adminRoleId(req))
  const was = String(relId(originalDoc.role)) === adminId
  const willBe = String(relId(data.role)) === adminId
  if (was && !willBe && (await countOtherAdmins(req, originalDoc.id)) === 0) {
    throw new APIError('Не можна змінити роль останнього адміністратора.', 400)
  }
  return data
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: L('Користувач', 'User'), plural: L('Користувачі', 'Users') },
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'name', 'role'], group: GROUP },
  auth: { depth: 1, maxLoginAttempts: 5, lockTime: 10 * 60 * 1000, tokenExpiration: 60 * 60 * 8 },
  access: { ...rbac('users', { selfRead: true }), admin: ({ req }) => Boolean(req.user) },
  hooks: { beforeDelete: [keepLastAdminOnDelete], beforeChange: [keepLastAdminOnChange] },
  fields: [
    { name: 'name', type: 'text', label: L('Імʼя', 'Name') },
    {
      name: 'role',
      type: 'relationship',
      relationTo: 'roles',
      required: true,
      label: L('Роль', 'Role'),
      // Змінювати роль може лише той, хто має право запису в `users` (інакше — ескалація привілеїв).
      access: { update: ({ req }) => userCan(req, 'users', 'write') },
    },
  ],
}

export const AuditLog: CollectionConfig = {
  slug: AUDIT_SLUG,
  dbName: 'audit_log',
  labels: { singular: L('Запис аудиту', 'Audit entry'), plural: L('Журнал аудиту', 'Audit log') },
  admin: {
    useAsTitle: 'at',
    defaultColumns: ['at', 'userEmail', 'action', 'collectionSlug', 'docId'],
    group: GROUP,
    components: { beforeListTable: ['@/components/admin/AuditExportLink#AuditExportLink'] },
  },
  timestamps: false,
  defaultSort: '-at',
  // Журнал лише для читання. Записи створює тільки сервер (overrideAccess);
  // UPDATE/DELETE додатково блокує тригер у БД — навіть для адміністратора.
  access: {
    read: ({ req }) => userCan(req, AUDIT_SLUG, 'read'),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  disableDuplicate: true,
  endpoints: [
    {
      path: '/export',
      method: 'get',
      handler: async (req) => {
        if (!req.user || !(await userCan(req, AUDIT_SLUG, 'read'))) return Response.json({ error: 'Forbidden' }, { status: 403 })
        const { docs } = await req.payload.find({ collection: AUDIT_SLUG, limit: 10000, sort: '-at', depth: 0, req })
        const csv = toCSV(
          ['at', 'userEmail', 'userId', 'action', 'collection', 'docId', 'before', 'after'],
          docs.map((d: any) => [d.at, d.userEmail, d.userId, d.action, d.collectionSlug, d.docId, d.before, d.after]),
        )
        return new Response(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        })
      },
    },
  ],
  fields: [
    { name: 'at', type: 'date', required: true, index: true, label: L('Час', 'Time'), admin: { date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd.MM.yyyy HH:mm:ss' } } },
    { name: 'userEmail', type: 'text', label: L('Користувач', 'User') },
    { name: 'userId', type: 'text', label: 'User ID' },
    {
      name: 'action',
      type: 'select',
      required: true,
      label: L('Дія', 'Action'),
      options: [
        { value: 'create', label: L('Створення', 'Create') },
        { value: 'update', label: L('Зміна', 'Update') },
        { value: 'delete', label: L('Видалення', 'Delete') },
      ],
    },
    { name: 'collectionSlug', type: 'text', required: true, index: true, label: L('Колекція', 'Collection') },
    { name: 'docId', type: 'text', required: true, index: true, label: L('ID документа', 'Document ID') },
    { name: 'before', type: 'json', label: L('До', 'Before') },
    { name: 'after', type: 'json', label: L('Після', 'After') },
  ],
}

export const SyncRuns: CollectionConfig = {
  slug: 'sync-runs',
  labels: { singular: L('Запуск синхронізації', 'Sync run'), plural: L('Запуски синхронізації', 'Sync runs') },
  admin: {
    useAsTitle: 'startedAt',
    defaultColumns: ['startedAt', 'source', 'trigger', 'created', 'updated', 'unchanged', 'skipped'],
    group: GROUP,
    components: { beforeListTable: ['@/components/admin/SyncButton#SyncButton'] },
  },
  defaultSort: '-startedAt',
  access: rbac('sync-runs'),
  endpoints: [
    {
      path: '/run',
      method: 'post',
      handler: async (req) => {
        if (!req.user || !(await userCan(req, 'sync-runs', 'write'))) return Response.json({ error: 'Forbidden' }, { status: 403 })
        const { runSync } = await import('../sync/run')
        const run = await runSync(req.payload, { trigger: 'manual', user: req.user })
        return Response.json(run)
      },
    },
  ],
  fields: [
    { name: 'startedAt', type: 'date', required: true, index: true, label: L('Початок', 'Started'), admin: { date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd.MM.yyyy HH:mm:ss' } } },
    { name: 'finishedAt', type: 'date', label: L('Завершення', 'Finished'), admin: { date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd.MM.yyyy HH:mm:ss' } } },
    { name: 'source', type: 'text', label: L('Джерело', 'Source') },
    {
      name: 'trigger',
      type: 'select',
      label: L('Спосіб запуску', 'Trigger'),
      options: [
        { value: 'manual', label: L('Кнопка в адмінці', 'Admin button') },
        { value: 'schedule', label: L('За розкладом', 'Scheduled') },
        { value: 'cli', label: 'CLI' },
        { value: 'seed', label: L('Початкове наповнення', 'Initial seed') },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'created', type: 'number', defaultValue: 0, label: L('Створено', 'Created') },
        { name: 'updated', type: 'number', defaultValue: 0, label: L('Оновлено', 'Updated') },
        { name: 'unchanged', type: 'number', defaultValue: 0, label: L('Без змін', 'Unchanged') },
        { name: 'skipped', type: 'number', defaultValue: 0, label: L('Пропущено (помилки)', 'Skipped (errors)') },
      ],
    },
    { name: 'errors', type: 'json', label: L('Помилки', 'Errors') },
  ],
}
