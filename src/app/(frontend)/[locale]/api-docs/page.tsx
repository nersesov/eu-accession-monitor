import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Breadcrumbs, PageHeader } from '@/components/ui'
import { RATE_LIMIT } from '@/lib/api'
import { openapi } from '@/lib/openapi'
import { buildMeta } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Api' })
  return buildMeta({ locale, path: '/api-docs', title: t('title'), description: t('lead', { limit: RATE_LIMIT }) })
}

// Опис у специфікації двомовний: «українською / in English»
const pick = (text: string, locale: string) => {
  const [uk, en] = text.split(' / ')
  return (locale === 'en' ? en : uk) ?? text
}

/** Документація генерується зі специфікації OpenAPI на сервері — без сторонніх скриптів. */
export default async function ApiDocsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations()
  const spec = openapi()

  return (
    <div>
      <Breadcrumbs label={t('Nav.breadcrumbs')} items={[{ href: '/', label: t('Site.home') }, { label: t('Api.title') }]} />
      <PageHeader title={t('Api.title')} lead={t('Api.lead', { limit: RATE_LIMIT })}>
        <p className="mt-4">
          <a href="/api/v1/openapi.json" className="btn btn-secondary">
            {t('Api.spec')}
          </a>
        </p>
      </PageHeader>

      <h2 className="mb-4 text-2xl font-bold text-ink">{t('Api.endpoints')}</h2>
      <div className="space-y-5">
        {Object.entries(spec.paths).map(([path, item]) => {
          const op = item.get
          const example = `/api/v1${path.replace('{slug}', 'sudova-reforma')}${locale === 'en' ? '?locale=en' : ''}`
          return (
            <section key={path} aria-labelledby={op.operationId} className="card p-5 sm:p-6">
              <h3 id={op.operationId} className="flex flex-wrap items-center gap-2 text-lg font-bold text-ink">
                <span className="rounded-md bg-done-soft px-2 py-0.5 text-sm font-bold text-done">GET</span>
                <code className="break-all">/api/v1{path}</code>
              </h3>
              <p className="mt-2 text-muted">{pick(op.summary, locale)}</p>

              <h4 className="mt-4 mb-2 text-sm font-semibold tracking-wide text-muted uppercase">{t('Api.params')}</h4>
              <div className="overflow-x-auto" tabIndex={0} role="group" aria-label={`${t('Api.params')}: ${path}`}>
                <table className="w-full min-w-[28rem] text-left text-[0.9375rem]">
                  <thead className="text-sm text-muted">
                    <tr className="border-b border-line">
                      <th scope="col" className="py-2 pr-4 font-semibold">
                        {t('Api.paramName')}
                      </th>
                      <th scope="col" className="py-2 pr-4 font-semibold">
                        {t('Api.paramIn')}
                      </th>
                      <th scope="col" className="py-2 font-semibold">
                        {t('Api.paramDesc')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {op.parameters.map((p: any) => (
                      <tr key={p.name}>
                        <th scope="row" className="py-2 pr-4 align-top font-semibold">
                          <code>{p.name}</code>
                          {p.required ? <span className="text-overdue"> *</span> : null}
                        </th>
                        <td className="py-2 pr-4 align-top text-muted">{p.in}</td>
                        <td className="py-2 align-top">
                          {pick(p.description, locale)}
                          {p.schema?.enum ? (
                            <span className="mt-1 block text-sm text-muted">
                              <code>{p.schema.enum.join(' | ')}</code>
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h4 className="mt-4 mb-2 text-sm font-semibold tracking-wide text-muted uppercase">{t('Api.example')}</h4>
              <p className="flex flex-wrap items-center gap-3">
                <code className="rounded-lg bg-bg px-3 py-2 text-sm break-all">GET {example}</code>
                <a href={example} className="link text-sm font-semibold">
                  {t('Api.tryIt')}
                </a>
              </p>
            </section>
          )
        })}
      </div>
    </div>
  )
}
