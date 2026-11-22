// Предметні колекції: глави → напрями → орієнтири → заходи → оновлення статусу.
import type { CollectionAfterChangeHook, CollectionConfig } from 'payload'
import { rbac } from '../access/rbac'
import { revalidateHooks } from '../hooks/revalidate'
import { L, STATUS_OPTIONS } from '../lib/labels'

const GROUP = L('Моніторинг', 'Monitoring')

export const Chapters: CollectionConfig = {
  slug: 'chapters',
  labels: { singular: L('Глава', 'Chapter'), plural: L('Глави', 'Chapters') },
  admin: { useAsTitle: 'title', defaultColumns: ['number', 'title', 'order'], group: GROUP },
  access: rbac('chapters', { publicRead: true }),
  hooks: revalidateHooks,
  defaultSort: 'order',
  fields: [
    { name: 'number', type: 'number', required: true, unique: true, index: true, label: L('Номер глави', 'Chapter number') },
    { name: 'title', type: 'text', required: true, localized: true, label: L('Назва', 'Title') },
    { name: 'description', type: 'textarea', localized: true, label: L('Опис', 'Description') },
    { name: 'order', type: 'number', defaultValue: 0, label: L('Порядок', 'Order') },
  ],
}

export const Directions: CollectionConfig = {
  slug: 'directions',
  labels: { singular: L('Напрям реформи', 'Reform direction'), plural: L('Напрями реформ', 'Reform directions') },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'chapter', 'slug', 'order'], group: GROUP },
  access: rbac('directions', { publicRead: true }),
  hooks: revalidateHooks,
  defaultSort: 'order',
  fields: [
    { name: 'chapter', type: 'relationship', relationTo: 'chapters', required: true, index: true, label: L('Глава', 'Chapter') },
    { name: 'title', type: 'text', required: true, localized: true, label: L('Назва', 'Title') },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'description', type: 'textarea', localized: true, label: L('Опис', 'Description') },
    {
      name: 'icon',
      type: 'select',
      defaultValue: 'scale',
      label: L('Іконка', 'Icon'),
      options: ['scale', 'shield', 'people', 'globe', 'lock'],
    },
    { name: 'order', type: 'number', defaultValue: 0, label: L('Порядок', 'Order') },
  ],
}

export const Benchmarks: CollectionConfig = {
  slug: 'benchmarks',
  labels: { singular: L('Проміжний орієнтир', 'Interim benchmark'), plural: L('Проміжні орієнтири', 'Interim benchmarks') },
  admin: { useAsTitle: 'code', defaultColumns: ['code', 'text', 'direction'], group: GROUP },
  access: rbac('benchmarks', { publicRead: true }),
  hooks: revalidateHooks,
  defaultSort: 'order',
  fields: [
    { name: 'direction', type: 'relationship', relationTo: 'directions', required: true, index: true, label: L('Напрям', 'Direction') },
    { name: 'code', type: 'text', required: true, unique: true, index: true, label: L('Код (напр. IBM-23-01)', 'Code (e.g. IBM-23-01)') },
    { name: 'text', type: 'textarea', required: true, localized: true, label: L('Формулювання', 'Wording') },
    {
      name: 'source',
      type: 'group',
      label: L('Джерело', 'Source'),
      fields: [
        { name: 'title', type: 'text', label: L('Назва документа', 'Document title') },
        { name: 'url', type: 'text', label: 'URL' },
      ],
    },
    { name: 'order', type: 'number', defaultValue: 0, label: L('Порядок', 'Order') },
  ],
}

/** Будь-яка зміна статусу опублікованого заходу (адмінка чи імпорт) фіксується в історії. */
const recordStatusChange: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req, context }) => {
  if (operation !== 'update' || doc._status !== 'published') return doc
  if (!previousDoc?.status || previousDoc.status === doc.status) return doc
  await req.payload.create({
    collection: 'status-updates',
    data: {
      measure: doc.id,
      date: new Date().toISOString(),
      fromStatus: previousDoc.status,
      toStatus: doc.status,
      comment: typeof context?.statusComment === 'string' ? context.statusComment : undefined,
      source: typeof context?.statusSource === 'string' ? context.statusSource : undefined,
    },
    req,
  })
  return doc
}

export const Measures: CollectionConfig = {
  slug: 'measures',
  labels: { singular: L('Захід', 'Measure'), plural: L('Заходи', 'Measures') },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'status', 'deadline', 'responsibleBody', 'benchmark'], group: GROUP },
  access: rbac('measures', { publicRead: true, drafts: true }),
  versions: { drafts: true, maxPerDoc: 25 },
  hooks: {
    afterChange: [recordStatusChange, ...revalidateHooks.afterChange],
    afterDelete: revalidateHooks.afterDelete,
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true, label: L('Що зробити', 'What to do') },
    { name: 'benchmark', type: 'relationship', relationTo: 'benchmarks', required: true, index: true, label: L('Орієнтир', 'Benchmark') },
    {
      type: 'row',
      fields: [
        { name: 'status', type: 'select', enumName: 'measure_status', required: true, defaultValue: 'not_started', index: true, options: STATUS_OPTIONS, label: L('Статус', 'Status') },
        { name: 'deadline', type: 'date', label: L('Строк', 'Deadline'), admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' } } },
      ],
    },
    { name: 'responsibleBody', type: 'text', localized: true, label: L('Відповідальний орган', 'Responsible body') },
    {
      name: 'evidenceLinks',
      type: 'array',
      label: L('Посилання на підтвердження', 'Evidence links'),
      fields: [
        { name: 'label', type: 'text', label: L('Підпис', 'Label') },
        { name: 'url', type: 'text', required: true, label: 'URL' },
      ],
    },
    { name: 'notes', type: 'textarea', localized: true, label: L('Примітки', 'Notes') },
    { name: 'tags', type: 'text', hasMany: true, label: L('Мітки', 'Tags') },
    {
      name: 'externalId',
      type: 'text',
      unique: true,
      index: true,
      label: L('Зовнішній ID (ключ імпорту)', 'External ID (import key)'),
      admin: { position: 'sidebar' },
    },
  ],
}

export const StatusUpdates: CollectionConfig = {
  slug: 'status-updates',
  labels: { singular: L('Оновлення статусу', 'Status update'), plural: L('Оновлення статусів', 'Status updates') },
  admin: { useAsTitle: 'date', defaultColumns: ['date', 'measure', 'fromStatus', 'toStatus'], group: GROUP },
  access: rbac('status-updates', { publicRead: true }),
  hooks: revalidateHooks,
  defaultSort: '-date',
  fields: [
    { name: 'measure', type: 'relationship', relationTo: 'measures', required: true, index: true, label: L('Захід', 'Measure') },
    { name: 'date', type: 'date', required: true, index: true, label: L('Дата', 'Date') },
    {
      type: 'row',
      fields: [
        { name: 'fromStatus', type: 'select', options: STATUS_OPTIONS, label: L('Старий статус', 'Previous status') },
        { name: 'toStatus', type: 'select', required: true, options: STATUS_OPTIONS, label: L('Новий статус', 'New status') },
      ],
    },
    { name: 'comment', type: 'textarea', localized: true, label: L('Коментар', 'Comment') },
    { name: 'source', type: 'text', label: L('Джерело (URL)', 'Source (URL)') },
    { name: 'externalId', type: 'text', unique: true, index: true, admin: { position: 'sidebar' }, label: L('Зовнішній ID (ключ імпорту)', 'External ID (import key)') },
  ],
}
