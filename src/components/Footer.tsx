import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { repoUrl } from '@/lib/format'

export async function Footer({ items }: { items: { href: string; label: string }[] }) {
  const t = await getTranslations()
  const repo = repoUrl()
  return (
    <footer className="on-dark mt-16 bg-footer text-white">
      <div className="container-page grid gap-8 py-10 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-lg font-bold tracking-tight">{t('Site.title')}</p>
          {/* Дисклеймер — на кожній сторінці */}
          <p className="mt-3 max-w-prose border-l-4 border-accent pl-4 text-base font-medium text-white">{t('Site.disclaimer')}</p>
          <p className="mt-3 max-w-prose text-sm text-[#cbd5e1]">{t('Site.demoDataNote')}</p>
        </div>
        <nav aria-label={t('Nav.footer')}>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-[0.9375rem]">
            {items.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="inline-flex min-h-11 items-center rounded text-white underline decoration-white/40 underline-offset-4">
                  {i.label}
                </Link>
              </li>
            ))}
            {repo ? (
              <li>
                <a href={repo} className="inline-flex min-h-11 items-center rounded text-white underline decoration-white/40 underline-offset-4" rel="noopener">
                  {t('Nav.repo')}
                </a>
              </li>
            ) : null}
            <li>
              {/* Адмінка — окремий кореневий layout, тому звичайне посилання з повним завантаженням */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/admin" className="inline-flex min-h-11 items-center rounded text-white underline decoration-white/40 underline-offset-4">
                {t('Nav.admin')}
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/15">
        <p className="container-page py-4 text-sm text-[#cbd5e1]">© {new Date().getFullYear()} · MIT License</p>
      </div>
    </footer>
  )
}
