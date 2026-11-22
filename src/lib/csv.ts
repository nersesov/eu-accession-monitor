/** Мінімальний серіалізатор CSV (RFC 4180) з BOM для коректного відкриття в Excel. */
export function toCSV(headers: string[], rows: unknown[][]): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
    // Захист від CSV-інʼєкцій у табличних редакторах
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
  }
  return '﻿' + [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n'
}
