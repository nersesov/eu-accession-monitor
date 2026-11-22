import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

export default async function NotFound() {
  const t = await getTranslations('NotFound')
  return (
    <div className="py-12 text-center sm:py-20">
      <p className="num text-6xl font-bold text-brand-strong" aria-hidden>
        404
      </p>
      <h1 className="mt-4 text-3xl font-bold text-ink">{t('title')}</h1>
      <p className="mx-auto mt-3 max-w-md text-muted">{t('text')}</p>
      <Link href="/" className="btn btn-primary mt-6">
        {t('home')}
      </Link>
    </div>
  )
}
