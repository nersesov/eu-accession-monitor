// Статуси заходу та обчислення прогресу. Чисті функції без залежностей — покриті unit-тестами.

export const STATUSES = ['not_started', 'in_progress', 'done', 'partial'] as const
export type Status = (typeof STATUSES)[number]
/** Статус для відображення: «прострочено» не зберігається, а обчислюється. */
export type DisplayStatus = Status | 'overdue'
export const DISPLAY_STATUSES: DisplayStatus[] = ['done', 'partial', 'in_progress', 'not_started', 'overdue']

export const STATUS_WEIGHT: Record<Status, number> = {
  not_started: 0,
  in_progress: 0,
  partial: 0.5,
  done: 1,
}

/** Початок доби (UTC) для порівняння дат без урахування часу. */
function dayStart(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/** Прострочено, якщо строк минув, а статус не «виконано». У день строку захід ще не прострочений. */
export function isOverdue(status: Status, deadline: string | Date | null | undefined, now: Date = new Date()): boolean {
  if (!deadline || status === 'done') return false
  const d = new Date(deadline)
  if (Number.isNaN(d.getTime())) return false
  return dayStart(d) < dayStart(now)
}

export function displayStatus(status: Status, deadline: string | Date | null | undefined, now: Date = new Date()): DisplayStatus {
  return isOverdue(status, deadline, now) ? 'overdue' : status
}

export type Progress = {
  total: number
  /** Відсоток 0–100, округлений до цілого. */
  percent: number
  /** Сума ваг: виконано = 1, частково = 0,5. */
  score: number
  counts: Record<DisplayStatus, number>
}

export function emptyCounts(): Record<DisplayStatus, number> {
  return { done: 0, partial: 0, in_progress: 0, not_started: 0, overdue: 0 }
}

export function computeProgress(
  measures: { status: Status; deadline?: string | Date | null }[],
  now: Date = new Date(),
): Progress {
  const counts = emptyCounts()
  let score = 0
  for (const m of measures) {
    score += STATUS_WEIGHT[m.status] ?? 0
    counts[displayStatus(m.status, m.deadline, now)] += 1
  }
  const total = measures.length
  return { total, score, percent: total === 0 ? 0 : Math.round((score / total) * 100), counts }
}

const UK_LABELS: Record<string, Status> = {
  'не розпочато': 'not_started',
  'у процесі': 'in_progress',
  'в процесі': 'in_progress',
  'виконано': 'done',
  'виконано частково': 'partial',
  'частково виконано': 'partial',
}

/** Приймає код (`done`) або українську назву (`виконано`) — зручно для Google Sheets. */
export function parseStatus(raw: string | null | undefined): Status | null {
  const v = (raw ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
  if (!v) return null
  if ((STATUSES as readonly string[]).includes(v)) return v as Status
  return UK_LABELS[v] ?? null
}

/** Кольори заливки для діаграм (перевірені на розрізнюваність при порушеннях кольоросприйняття). */
export const STATUS_FILL: Record<DisplayStatus, string> = {
  done: '#15803d',
  partial: '#eda100',
  in_progress: '#2a78d6',
  not_started: '#8492a6',
  overdue: '#d03b3b',
}
