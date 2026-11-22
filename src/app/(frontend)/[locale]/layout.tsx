import type { Metadata, Viewport } from 'next'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Inter } from 'next/font/google'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { routing } from '@/i18n/routing'
import { getTree } from '@/lib/data'
import { siteUrl } from '@/lib/format'
import '../globals.css'

// Дані читаються з БД під час запиту (з кешем у lib/data.ts), тому збірка не потребує бази.
export const dynamic = 'force-dynamic'

const inter = Inter({ subsets: ['latin', 'cyrillic'], display: 'swap', variable: '--font-inter' })

type Props = { children: ReactNode; params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Site' })
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t('title'), template: `%s — ${t('name')}` },
    description: t('description'),
    applicationName: t('name'),
    openGraph: { siteName: t('title'), type: 'website' },
    icons: { icon: '/icon.svg' },
  }
}

export const viewport: Viewport = { themeColor: '#1e3a8a', width: 'device-width', initialScale: 1 }

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)
  const t = await getTranslations()
  const tree = await getTree(locale)

  const nav = [
    ...tree.chapters.map((c) => ({ href: `/${c.slug}`, label: t('Nav.chapter', { number: c.number }) })),
    { href: '/novyny', label: t('Nav.news') },
    { href: '/metodolohiia', label: t('Nav.methodology') },
    { href: '/pro-proiekt', label: t('Nav.about') },
    { href: '/api-docs', label: t('Nav.api') },
  ]

  return (
    <html lang={locale} className={inter.variable}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-lg bg-brand-strong px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {t('Site.skip')}
        </a>
        <NextIntlClientProvider>
          <Header items={nav} />
          <main id="main" tabIndex={-1} className="container-page flex-1 py-8 outline-none sm:py-10">
            {children}
          </main>
          <Footer items={nav} />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
