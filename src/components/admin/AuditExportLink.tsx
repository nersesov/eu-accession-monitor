import React from 'react'

export function AuditExportLink() {
  return (
    <p style={{ marginBottom: 16 }}>
      <a href="/api/audit-log/export" download>
        Експортувати журнал у CSV
      </a>
      <span style={{ opacity: 0.7, fontSize: 13, marginLeft: 12 }}>Журнал доступний лише для читання: записи не можна змінити чи видалити.</span>
    </p>
  )
}
