import React from 'react'

export default function BarChart({ data = [], width = 200, height = 96 }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map(d => d.value), 1)
  const barHeight = Math.floor(height / data.length) - 8
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {data.map((d, i) => {
        const y = i * (barHeight + 8) + 8
        const w = Math.round((d.value / max) * (width - 90))
        const color = d.color || (d.label === 'Admins' ? '#7c3aed' : d.label === 'Faculty' ? '#06b6d4' : '#f59e0b')
        return (
          <g key={d.label} transform={`translate(0, ${y})`}>
            <text x={6} y={barHeight / 2 + 6} fontSize="11" fill="#374151">{d.label}</text>
            <rect x={90} y={0} width={w} height={barHeight} rx={6} fill={color} />
            <text x={90 + w + 8} y={barHeight / 2 + 6} fontSize="11" fill="#111827">{d.value}</text>
          </g>
        )
      })}
    </svg>
  )
}
