import { notFound } from 'next/navigation'
import { applyRedirect } from '@/lib/redirects'

type Props = { params: Promise<{ locale: string; rest: string[] }> }

/** Невідомі адреси: спершу шукаємо правило в колекції `redirects`, інакше — 404. */
export default async function CatchAll({ params }: Props) {
  const { locale, rest } = await params
  await applyRedirect(locale, `/${rest.join('/')}`)
  notFound()
}
