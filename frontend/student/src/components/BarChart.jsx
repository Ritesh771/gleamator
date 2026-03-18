import React from 'react'

export default function BarChart({ data = [], width = 200, height = 96, format = v => v }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map(d => d.value), 1)
  const barHeight = Math.max(12, Math.floor(height / (data.length || 1)) - 8)
  const labelWidth = 80
  const valueWidth = 40
  const chartWidth = width - labelWidth - valueWidth

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {data.map((d, i) => {
        const y = i * (barHeight + 8)
        if (y > height - barHeight) return null // ensure we don't render outside of viewbox
        const w = Math.max(0, Math.round((d.value / max) * chartWidth))
        const color = d.color || (d.label === 'Admins' ? '#7c3aed' : d.label === 'Faculty' ? '#06b6d4' : '#f59e0b')
        const truncatedLabel = (d.label || '').length > 10 ? `${(d.label || '').slice(0, 9)}…` : d.label
        return (
          <g key={d.label} transform={`translate(0, ${y})`}>
            <text x={6} y={barHeight / 2 + 6} fontSize="12" fill="var(--muted)">{truncatedLabel}</text>
            <rect x={labelWidth} y={0} width={w} height={barHeight} rx={4} fill={color} />
            <text x={labelWidth + w + 8} y={barHeight / 2 + 6} fontSize="12" fill="var(--text-color)" fontWeight="600">{format(d.value)}</text>
          </g>
        )
      })}
    </svg>
  )
}
