'use client'
// Recharts підвантажується окремим чанком після першого рендеру — не впливає на LCP.
// Місце під діаграму зарезервоване (220×220), тому зсуву макета (CLS) немає.
import dynamic from 'next/dynamic'
import type { DonutDatum } from './StatusDonut'

const Donut = dynamic(() => import('./StatusDonut').then((m) => m.StatusDonut), {
  ssr: false,
  loading: () => <div className="mx-auto h-[220px] w-[220px] max-w-full rounded-full border-[36px] border-[#e3e8f0]" aria-hidden />,
})

export function StatusDonutLazy(props: { data: DonutDatum[]; total: number; totalLabel: string; ariaLabel: string }) {
  return <Donut {...props} />
}
