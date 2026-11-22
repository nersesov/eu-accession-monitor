// Колекції сайту: сторінки, новини, медіа, редиректи.
import type { CollectionConfig } from 'payload'
import { rbac } from '../access/rbac'
import { contentBlocks, seoField, slugField } from '../blocks'
import { revalidateHooks } from '../hooks/revalidate'
import { L } from '../lib/labels'

const GROUP = L('Сайт', 'Site')

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: L('Сторінка', 'Page'), plural: L('Сторінки', 'Pages') },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', '_status'], group: GROUP },
  access: rbac('pages', { publicRead: true, drafts: true }),
  versions: { drafts: true, maxPerDoc: 25 },
  hooks: revalidateHooks,
  fields: [
    { name: 'title', type: 'text', required: true, localized: true, label: L('Заголовок', 'Title') },
    slugField('title'),
    { name: 'blocks', type: 'blocks', localized: true, blocks: contentBlocks, label: L('Блоки', 'Blocks') },
    seoField,
  ],
}

export const News: CollectionConfig = {
  slug: 'news',
  labels: { singular: L('Новина', 'News item'), plural: L('Новини', 'News') },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'date', 'tags', '_status'], group: GROUP },
  access: rbac('news', { publicRead: true, drafts: true }),
  versions: { drafts: true, maxPerDoc: 25 },
  hooks: revalidateHooks,
  defaultSort: '-date',
  fields: [
    { name: 'title', type: 'text', required: true, localized: true, label: L('Заголовок', 'Title') },
    slugField('title'),
    { name: 'date', type: 'date', required: true, index: true, label: L('Дата', 'Date'), admin: { position: 'sidebar' } },
    { name: 'excerpt', type: 'textarea', localized: true, label: L('Короткий опис', 'Excerpt') },
    { name: 'blocks', type: 'blocks', localized: true, blocks: contentBlocks, label: L('Блоки', 'Blocks') },
    { name: 'tags', type: 'text', hasMany: true, localized: true, label: L('Мітки', 'Tags') },
    seoField,
  ],
}

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: L('Медіафайл', 'Media file'), plural: L('Медіа', 'Media') },
  admin: { group: GROUP },
  access: rbac('media', { publicRead: true }),
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/*', 'application/pdf'],
    imageSizes: [{ name: 'card', width: 768 }],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      localized: true,
      label: L('Альтернативний текст (обовʼязково)', 'Alternative text (required)'),
    },
  ],
}

export const Redirects: CollectionConfig = {
  slug: 'redirects',
  labels: { singular: L('Редирект', 'Redirect'), plural: L('Редиректи', 'Redirects') },
  admin: { useAsTitle: 'from', defaultColumns: ['from', 'to', 'type'], group: GROUP },
  access: rbac('redirects', { publicRead: true }),
  fields: [
    {
      name: 'from',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: L('Звідки (шлях, напр. /old-page)', 'From (path, e.g. /old-page)'),
      validate: (v: unknown) => (typeof v === 'string' && v.startsWith('/') ? true : 'Шлях має починатися з /'),
    },
    { name: 'to', type: 'text', required: true, label: L('Куди (шлях або URL)', 'To (path or URL)') },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: '301',
      options: [
        { value: '301', label: L('301 — постійний', '301 — permanent') },
        { value: '302', label: L('302 — тимчасовий', '302 — temporary') },
      ],
    },
  ],
}
