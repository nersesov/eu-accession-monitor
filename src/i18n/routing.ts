import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['uk', 'en'],
  defaultLocale: 'uk',
  // uk — без префікса, en — з префіксом /en
  localePrefix: 'as-needed',
  localeDetection: false,
})

export type Locale = (typeof routing.locales)[number]
