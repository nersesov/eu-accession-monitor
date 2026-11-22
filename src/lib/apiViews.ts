import type { DirectionView, MeasureView } from './data'
import { localizedUrl } from './seo'

export const measureJson = (m: MeasureView, locale: string) => ({
  id: m.id,
  externalId: m.externalId,
  title: m.title,
  status: m.status,
  displayStatus: m.displayStatus,
  deadline: m.deadline,
  responsibleBody: m.responsibleBody,
  evidenceLinks: m.evidenceLinks,
  notes: m.notes,
  tags: m.tags,
  benchmark: m.benchmark.code,
  direction: m.direction.slug,
  chapter: m.chapter.number,
  url: localizedUrl(locale, `/zakhid/${m.id}`),
})

export const directionSummary = (d: DirectionView) => ({ slug: d.slug, title: d.title, chapter: d.chapter.number, progress: d.progress })
