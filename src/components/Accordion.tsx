'use client'
// Акордеон за WAI-ARIA APG: кнопка в заголовку, aria-expanded/aria-controls, панель role="region".
// Клавіатура: Enter/Space — розгорнути; ↑/↓/Home/End — перехід між заголовками.
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Chevron } from './icons'

export type AccordionItem = { id: string; header: ReactNode; meta?: ReactNode; content: ReactNode }

type Props = {
  items: AccordionItem[]
  defaultOpen?: string[]
  headingLevel?: 'h2' | 'h3' | 'h4'
  labels?: { expandAll: string; collapseAll: string }
}

export function Accordion({ items, defaultOpen = [], headingLevel: Heading = 'h3', labels }: Props) {
  const uid = useId()
  const [open, setOpen] = useState<Set<string>>(() => new Set(defaultOpen))
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = items.length - 1
    const target = e.key === 'ArrowDown' ? (index === last ? 0 : index + 1) : e.key === 'ArrowUp' ? (index === 0 ? last : index - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? last : null
    if (target === null) return
    e.preventDefault()
    buttons.current[target]?.focus()
  }

  const allOpen = items.length > 0 && items.every((i) => open.has(i.id))

  return (
    <div>
      {labels && items.length > 1 ? (
        <div className="mb-3 flex justify-end">
          <button type="button" className="btn btn-secondary" aria-expanded={allOpen} onClick={() => setOpen(allOpen ? new Set() : new Set(items.map((i) => i.id)))}>
            {allOpen ? labels.collapseAll : labels.expandAll}
          </button>
        </div>
      ) : null}
      <div className="card divide-y divide-line overflow-hidden">
        {items.map((item, index) => {
          const isOpen = open.has(item.id)
          const buttonId = `${uid}-b-${item.id}`
          const panelId = `${uid}-p-${item.id}`
          return (
            <div key={item.id}>
              <Heading className="m-0">
                <button
                  ref={(el) => {
                    buttons.current[index] = el
                  }}
                  id={buttonId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(item.id)}
                  onKeyDown={(e) => onKeyDown(e, index)}
                  className="flex w-full items-start gap-3 px-4 py-4 text-left sm:px-5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-ink sm:text-[1.0625rem]">{item.header}</span>
                    {item.meta ? <span className="mt-1.5 block text-sm font-normal text-muted">{item.meta}</span> : null}
                  </span>
                  <Chevron className="acc-chevron mt-0.5 shrink-0 text-muted" />
                </button>
              </Heading>
              <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!isOpen} className="acc-panel border-t border-line bg-[#fafbfc] px-4 py-4 sm:px-5">
                {item.content}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
