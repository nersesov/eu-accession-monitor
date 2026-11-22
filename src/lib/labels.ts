/** Двомовний підпис для адмінки Payload. */
export const L = (uk: string, en: string) => ({ uk, en })

export const STATUS_OPTIONS = [
  { value: 'not_started', label: L('Не розпочато', 'Not started') },
  { value: 'in_progress', label: L('У процесі', 'In progress') },
  { value: 'done', label: L('Виконано', 'Done') },
  { value: 'partial', label: L('Виконано частково', 'Partially done') },
]

export function slugify(input: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch',
    ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', "'": '', '’': '',
  }
  return input
    .toLowerCase()
    .split('')
    .map((c) => map[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
