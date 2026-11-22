import type { Metadata } from 'next'
import { siteUrl } from './format'

export function localizedUrl(locale: string, path: string): string {
  const p = path === '/' ? '' : path
  return `${siteUrl()}${locale === 'en' ? '/en' : ''}${p}` || siteUrl()
}

/** canonical, hreflang uk/en та Open Graph для сторінки. `path` — без префікса мови, напр. `/glava-23`. */
export function buildMeta(args: { locale: string; path: string; title?: string; description?: string; type?: 'website' | 'article' }): Metadata {
  const { locale, path, title, description, type = 'website' } = args
  const url = localizedUrl(locale, path)
  return {
    ...(title ? { title } : {}),
    description,
    alternates: {
      canonical: url,
      languages: { uk: localizedUrl('uk', path), en: localizedUrl('en', path), 'x-default': localizedUrl('uk', path) },
    },
    openGraph: { title, description, url, type, locale: locale === 'en' ? 'en_GB' : 'uk_UA', alternateLocale: locale === 'en' ? 'uk_UA' : 'en_GB' },
    twitter: { card: 'summary', title, description },
  }
}
