'use client'
import { Button, toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

export function SyncButton() {
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  const run = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/sync-runs/run', { method: 'POST', credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || data?.errors?.[0]?.message || `HTTP ${res.status}`)
      const errors = Array.isArray(data.errors) ? data.errors.length : 0
      const summary = `Створено: ${data.created}, оновлено: ${data.updated}, без змін: ${data.unchanged}, пропущено: ${data.skipped}`
      if (errors) toast.warning(`Синхронізацію завершено з помилками (${errors}). ${summary}`)
      else toast.success(`Синхронізацію завершено. ${summary}`)
      router.refresh()
    } catch (err) {
      toast.error(`Не вдалося синхронізувати: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <Button onClick={run} disabled={busy} size="medium">
        {busy ? 'Синхронізація…' : 'Синхронізувати'}
      </Button>
      <span style={{ opacity: 0.7, fontSize: 13 }}>Імпорт із Google Sheets (або локальних CSV, якщо GOOGLE_SHEET_ID не задано). Повторний запуск не створює дублікатів.</span>
    </div>
  )
}
