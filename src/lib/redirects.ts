import 'server-only'
import { permanentRedirect, redirect } from 'next/navigation'
import { findRedirect } from './data'

/** Якщо для шляху є правило в колекції `redirects` — виконує 301/302. */
export async function applyRedirect(locale: string, pathname: string) {
  const rule = await findRedirect(pathname)
  if (!rule) return
  const target = rule.to.startsWith('/') && locale === 'en' ? `/en${rule.to}` : rule.to
  if (rule.permanent) permanentRedirect(target)
  redirect(target)
}
