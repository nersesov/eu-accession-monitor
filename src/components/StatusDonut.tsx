'use client'
// Кільцева діаграма розподілу заходів за статусами (Recharts).
// Дані дублюються текстовим списком поруч, тож діаграма для екранних читачів — одне зображення з описом.
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

export type DonutDatum = { key: string; label: string; value: number; color: string }

export function StatusDonut({ data, total, totalLabel, ariaLabel }: { data: DonutDatum[]; total: number; totalLabel: string; ariaLabel: string }) {
  const visible = data.filter((d) => d.value > 0)
  return (
    <div role="img" aria-label={ariaLabel} className="relative mx-auto h-[220px] w-[220px] max-w-full">
      {/* Підпис у центрі стоїть у розмітці до діаграми і має нижчий z-index, тож підказка завжди поверх нього. */}
      <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center" aria-hidden>
        <span className="num text-4xl font-bold text-ink">{total}</span>
        <span className="text-sm text-muted">{totalLabel}</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart accessibilityLayer={false}>
          <Pie
            data={visible}
            dataKey="value"
            nameKey="label"
            innerRadius={68}
            outerRadius={104}
            startAngle={90}
            endAngle={-270}
            paddingAngle={visible.length > 1 ? 2 : 0}
            cornerRadius={4}
            stroke="none"
            isAnimationActive={false}
          >
            {visible.map((d) => (
              <Cell key={d.key} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [`${value} (${Math.round((Number(value) / Math.max(total, 1)) * 100)}%)`, name]}
            contentStyle={{ borderRadius: 10, border: '1px solid #d9dee7', fontSize: 14, color: '#0f1b2d', boxShadow: '0 6px 20px -12px rgb(15 27 45 / 0.35)' }}
            itemStyle={{ color: '#0f1b2d' }}
            wrapperStyle={{ zIndex: 10 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
