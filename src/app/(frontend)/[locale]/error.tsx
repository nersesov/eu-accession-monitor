'use client'
import { useTranslations } from 'next-intl'

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('Error')
  return (
    <div className="py-12 text-center sm:py-20" role="alert">
      <h1 className="text-3xl font-bold text-ink">{t('title')}</h1>
      <p className="mx-auto mt-3 max-w-md text-muted">{t('text')}</p>
      <button type="button" className="btn btn-primary mt-6" onClick={reset}>
        {t('retry')}
      </button>
    </div>
  )
}
