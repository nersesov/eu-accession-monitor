import type { Metadata } from 'next'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { Breadcrumbs, ExternalLink, PageHeader } from '@/components/ui'
import { repoUrl } from '@/lib/format'
import { buildMeta } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'About' })
  return buildMeta({ locale, path: '/pro-proiekt', title: t('title'), description: t('lead') })
}

const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="mt-10 mb-3 text-2xl font-bold text-ink">{children}</h2>

export default async function AboutPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations()
  const features = ((await getMessages()) as any).About.features as string[]
  const repo = repoUrl()

  return (
    <div>
      <Breadcrumbs label={t('Nav.breadcrumbs')} items={[{ href: '/', label: t('Site.home') }, { label: t('About.title') }]} />
      <PageHeader title={t('About.title')} lead={t('About.lead')} />
      <div className="max-w-3xl">
        <H2>{t('About.whatTitle')}</H2>
        <p className="prose-measure">{t('About.what')}</p>

        <H2>{t('About.disclaimerTitle')}</H2>
        <div className="card border-l-4 border-l-accent p-5">
          <p className="font-semibold text-ink">{t('Site.disclaimer')}</p>
          <p className="mt-2 text-muted">{t('Site.demoDataNote')}</p>
        </div>

        <H2>{t('About.featuresTitle')}</H2>
        <ul className="list-disc space-y-2 pl-5">
          {features.map((f) => (
            <li key={f} className="prose-measure">
              {f}
            </li>
          ))}
        </ul>

        <H2>{t('About.stackTitle')}</H2>
        <p className="prose-measure">{t('About.stack')}</p>

        <H2>{t('About.authorTitle')}</H2>
        <p className="prose-measure">{t('About.author')}</p>

        <H2>{t('About.repoTitle')}</H2>
        <p className="prose-measure">
          {t('About.repo')} {repo ? <ExternalLink href={repo}>{t('About.repoLink')}</ExternalLink> : null}
        </p>
      </div>
    </div>
  )
}
