'use client'
import { useLocale, useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Link, usePathname } from '@/i18n/navigation'
import { Logo } from './icons'

type NavItem = { href: string; label: string }

function LocaleLink({ query }: { query: string }) {
  const t = useTranslations('Nav')
  const locale = useLocale()
  const pathname = usePathname()
  const other = locale === 'uk' ? 'en' : 'uk'
  return (
    <Link
      href={query ? `${pathname}?${query}` : pathname}
      locale={other}
      hrefLang={other}
      lang={other}
      className="nav-link inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 text-sm font-semibold text-ink"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden focusable={false}>
        <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.3" />
        <path d="M1.7 8h12.6M8 1.7c1.9 1.7 2.8 3.8 2.8 6.3S9.9 12.6 8 14.3C6.1 12.6 5.2 10.5 5.2 8S6.1 3.4 8 1.7z" stroke="currentColor" strokeWidth="1.3" />
      </svg>
      {t('switchTo')}
    </Link>
  )
}

/** Зберігає параметри запиту (фільтри) при перемиканні мови. Сторінки рендеряться динамічно, тому Suspense не потрібен. */
function LocaleSwitch() {
  return <LocaleLink query={useSearchParams().toString()} />
}

export function Header({ items }: { items: NavItem[] }) {
  const t = useTranslations()
  const pathname = usePathname()
  // Меню відкрите лише для сторінки, на якій його відкрили: після переходу воно закривається саме
  const [openFor, setOpenFor] = useState<string | null>(null)
  const open = openFor === pathname
  const setOpen = (value: boolean) => setOpenFor(value ? pathname : null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenFor(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className="border-b border-line bg-surface">
      <div className="container-page flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5">
        <Link href="/" className="flex min-h-11 items-center gap-2.5 rounded-lg">
          <Logo className="shrink-0" />
          <span className="leading-tight">
            <span className="block text-base font-bold tracking-tight text-ink">{t('Site.name')}</span>
            <span className="block text-xs font-medium text-muted">{t('Site.tagline')}</span>
            <span className="sr-only"> — {t('Site.home')}</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 lg:order-3">
          <LocaleSwitch />
          <button
            type="button"
            className="btn btn-secondary lg:hidden"
            aria-expanded={open}
            aria-controls="main-nav"
            onClick={() => setOpen(!open)}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden focusable={false}>
              {open ? (
                <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path d="M2.5 5h13M2.5 9h13M2.5 13h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
            {t('Nav.menu')}
          </button>
        </div>

        <nav id="main-nav" aria-label={t('Nav.main')} className={`${open ? 'block' : 'hidden'} w-full lg:order-2 lg:block lg:w-auto`}>
          <ul className="flex flex-col gap-1 pb-2 lg:flex-row lg:items-center lg:pb-0">
            {items.map((item) => {
              const active = isActive(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`nav-link flex min-h-11 items-center rounded-lg px-3 text-[0.9375rem] font-medium transition-colors duration-150 ${active ? 'bg-brand-soft font-semibold text-brand-strong' : 'text-ink'}`}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </header>
  )
}
