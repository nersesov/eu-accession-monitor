const TAG: Record<string, string> = { uk: 'uk-UA', en: 'en-GB' }

/** Абсолютна дата: «30 червня 2026 р.» / «30 June 2026». */
export function formatDate(locale: string, iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(TAG[locale] ?? 'uk-UA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Kyiv', ...opts }).format(d)
}

export function formatDateTime(locale: string, iso: string | null | undefined): string {
  return formatDate(locale, iso, { hour: '2-digit', minute: '2-digit' })
}

export const siteUrl = () => (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
export const repoUrl = () => process.env.REPO_URL || ''
