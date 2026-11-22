import type { Block, Field } from 'payload'
import { L } from '../lib/labels'

export const TextBlock: Block = {
  slug: 'text',
  labels: { singular: L('Текст', 'Text'), plural: L('Текст', 'Text') },
  fields: [{ name: 'content', type: 'richText', required: true, label: L('Вміст', 'Content') }],
}

export const AccordionBlock: Block = {
  slug: 'accordion',
  labels: { singular: L('Акордеон', 'Accordion'), plural: L('Акордеони', 'Accordions') },
  fields: [
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      label: L('Елементи', 'Items'),
      fields: [
        { name: 'title', type: 'text', required: true, label: L('Заголовок', 'Title') },
        { name: 'content', type: 'richText', required: true, label: L('Вміст', 'Content') },
      ],
    },
  ],
}

export const CTABlock: Block = {
  slug: 'cta',
  labels: { singular: L('Заклик до дії', 'Call to action'), plural: L('Заклики до дії', 'Calls to action') },
  fields: [
    { name: 'heading', type: 'text', required: true, label: L('Заголовок', 'Heading') },
    { name: 'text', type: 'textarea', label: L('Текст', 'Text') },
    { name: 'buttonLabel', type: 'text', required: true, label: L('Текст кнопки', 'Button label') },
    { name: 'buttonUrl', type: 'text', required: true, label: L('Посилання', 'URL') },
  ],
}

export const EmbedBlock: Block = {
  slug: 'embed',
  labels: { singular: L('Вбудований вміст', 'Embed'), plural: L('Вбудований вміст', 'Embeds') },
  fields: [
    {
      name: 'url',
      type: 'text',
      required: true,
      label: 'URL (https)',
      validate: (v: unknown) => (typeof v === 'string' && v.startsWith('https://') ? true : 'URL має починатися з https://'),
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: L('Назва (для екранних читачів)', 'Title (for screen readers)'),
    },
  ],
}

export const contentBlocks: Block[] = [TextBlock, AccordionBlock, CTABlock, EmbedBlock]

export const seoField: Field = {
  name: 'meta',
  type: 'group',
  label: 'SEO',
  fields: [
    { name: 'title', type: 'text', localized: true, label: L('SEO-заголовок', 'SEO title') },
    { name: 'description', type: 'textarea', localized: true, label: L('SEO-опис', 'SEO description') },
  ],
}

export const slugField = (source: string): Field => ({
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  admin: { position: 'sidebar', description: L('Латиниця, цифри, дефіс. Порожнє — згенерується з назви.', 'Latin letters, digits, hyphen. Empty — generated from the title.') },
  hooks: {
    beforeValidate: [
      async ({ value, data }) => {
        const { slugify } = await import('../lib/labels')
        if (typeof value === 'string' && value.trim()) return slugify(value)
        const src = data?.[source]
        return typeof src === 'string' ? slugify(src) : value
      },
    ],
  },
})
