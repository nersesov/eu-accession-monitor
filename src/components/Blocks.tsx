// Рендер блоків контенту (Text, Accordion, CTA, Embed) для сторінок і новин.
import { RichText } from '@payloadcms/richtext-lexical/react'
import { Accordion } from './Accordion'

const isInternal = (url: string) => url.startsWith('/')

export function Blocks({ blocks }: { blocks: any[] }) {
  if (!blocks?.length) return null
  return (
    <div className="space-y-8">
      {blocks.map((block, i) => {
        const key = block.id ?? i
        switch (block.blockType) {
          case 'text':
            return (
              <div key={key} className="rich prose-measure text-[1.0625rem] text-ink">
                <RichText data={block.content} />
              </div>
            )
          case 'accordion':
            return (
              <div key={key} className="max-w-3xl">
                <Accordion
                  headingLevel="h2"
                  items={(block.items ?? []).map((item: any, j: number) => ({
                    id: String(item.id ?? j),
                    header: item.title,
                    content: (
                      <div className="rich prose-measure text-ink">
                        <RichText data={item.content} />
                      </div>
                    ),
                  }))}
                />
              </div>
            )
          case 'cta':
            return (
              <aside key={key} className="card max-w-3xl border-l-4 border-l-accent p-5 sm:p-6">
                <h2 className="text-xl font-bold text-ink">{block.heading}</h2>
                {block.text ? <p className="mt-2 text-muted">{block.text}</p> : null}
                <a href={block.buttonUrl} className="btn btn-primary mt-4" {...(isInternal(block.buttonUrl) ? {} : { rel: 'noopener noreferrer' })}>
                  {block.buttonLabel}
                </a>
              </aside>
            )
          case 'embed':
            return typeof block.url === 'string' && block.url.startsWith('https://') ? (
              <div key={key} className="card max-w-3xl overflow-hidden">
                <iframe
                  src={block.url}
                  title={block.title}
                  loading="lazy"
                  className="aspect-video w-full"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            ) : null
          default:
            return null
        }
      })}
    </div>
  )
}
