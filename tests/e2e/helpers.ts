import AxeBuilder from '@axe-core/playwright'
import { expect, type APIRequestContext, type Page } from '@playwright/test'

export const DISCLAIMER = {
  uk: 'Незалежний демонстраційний проєкт. Не є офіційним ресурсом органів влади України чи ЄС.',
  en: 'Independent demonstration project. Not an official resource of the authorities of Ukraine or the EU.',
}

export async function firstMeasureId(request: APIRequestContext): Promise<number> {
  const res = await request.get('/api/measures?limit=1&depth=0&sort=externalId')
  return (await res.json()).docs[0].id
}

/** Шаблони сторінок публічної частини (шлях без префікса мови). */
export async function templates(request: APIRequestContext) {
  const id = await firstMeasureId(request)
  return [
    { name: 'home', path: '/' },
    { name: 'chapter', path: '/glava-23' },
    { name: 'direction', path: '/glava-23/sudova-reforma' },
    { name: 'direction-filtered', path: '/glava-23/sudova-reforma?status=done' },
    { name: 'measure', path: `/zakhid/${id}` },
    { name: 'news', path: '/novyny' },
    { name: 'news-item', path: '/novyny/vidkrytyi-api' },
    { name: 'methodology', path: '/metodolohiia' },
    { name: 'about', path: '/pro-proiekt' },
    { name: 'api-docs', path: '/api-docs' },
    { name: 'cms-page', path: '/dzherela' },
    { name: 'not-found', path: '/takoi-storinky-nemaie' },
  ]
}

export const withLocale = (locale: 'uk' | 'en', path: string) => (locale === 'en' ? `/en${path === '/' ? '' : path}` : path)

export async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze()
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).slice(0, 5).join('\n  ')}`)
  expect(summary, summary.join('\n\n')).toEqual([])
}
