'use client'
// Редактор матриці прав ролі. Рядки = колекції (список приходить із конфігурації автоматично).
import { useField } from '@payloadcms/ui'
import React from 'react'

type Action = 'read' | 'write' | 'delete'
type Matrix = Record<string, Partial<Record<Action, boolean>>>
type Props = { path: string; collections: { slug: string; label: string }[]; readOnly?: boolean }

const ACTIONS: { key: Action; label: string }[] = [
  { key: 'read', label: 'Читання' },
  { key: 'write', label: 'Запис' },
  { key: 'delete', label: 'Видалення' },
]

const cell: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid var(--theme-elevation-150)', textAlign: 'center' }

export function PermissionsMatrix({ path, collections, readOnly }: Props) {
  const { value, setValue } = useField<Matrix>({ path })
  const matrix: Matrix = value && typeof value === 'object' ? value : {}

  const toggle = (slug: string, action: Action, checked: boolean) => {
    const row = { ...matrix[slug], [action]: checked }
    // Запис і видалення без читання не мають сенсу — читання вмикається автоматично
    if (checked && action !== 'read') row.read = true
    setValue({ ...matrix, [slug]: row })
  }

  const setColumn = (action: Action, checked: boolean) => {
    const next: Matrix = { ...matrix }
    for (const c of collections) {
      next[c.slug] = { ...next[c.slug], [action]: checked }
      if (checked && action !== 'read') next[c.slug].read = true
    }
    setValue(next)
  }

  return (
    <div className="field-type" style={{ marginBottom: 24 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 720 }}>
        <caption style={{ textAlign: 'left', fontWeight: 600, paddingBottom: 8 }}>Права доступу до колекцій</caption>
        <thead>
          <tr>
            <th scope="col" style={{ ...cell, textAlign: 'left' }}>
              Колекція
            </th>
            {ACTIONS.map((a) => (
              <th key={a.key} scope="col" style={cell}>
                <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    aria-label={`${a.label}: усі колекції`}
                    checked={collections.every((c) => matrix[c.slug]?.[a.key])}
                    onChange={(e) => setColumn(a.key, e.target.checked)}
                  />
                  {a.label}
                </label>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {collections.map((c) => (
            <tr key={c.slug}>
              <th scope="row" style={{ ...cell, textAlign: 'left', fontWeight: 400 }}>
                {c.label} <code style={{ opacity: 0.6, fontSize: 12 }}>{c.slug}</code>
              </th>
              {ACTIONS.map((a) => (
                <td key={a.key} style={cell}>
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    aria-label={`${c.label}: ${a.label}`}
                    checked={Boolean(matrix[c.slug]?.[a.key])}
                    onChange={(e) => toggle(c.slug, a.key, e.target.checked)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ opacity: 0.7, marginTop: 8, fontSize: 13 }}>
        Роль <code>admin</code> завжди має повний доступ незалежно від матриці. Нові колекції зʼявляються тут автоматично.
      </p>
    </div>
  )
}
