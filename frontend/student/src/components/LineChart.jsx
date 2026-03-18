import React from 'react'

export default function LineChart({ data = [], width = 420, height = 160, padding = 32 }) {
  if (!data || data.length === 0) return null
  const values = data.map(d => (d.value == null ? 0 : d.value))
  const max = Math.max(...values, 100)
  const min = Math.min(...values, 0)
  const innerW = Math.max(24, width - padding * 2)
  const innerH = Math.max(24, height - padding * 2)
  const stepX = innerW / Math.max(1, data.length - 1)

  const points = data.map((d, i) => {
    const x = padding + i * stepX
    const v = d.value == null ? 0 : d.value
    const y = padding + innerH - ((v - min) / (max - min || 1)) * innerH
    return { x, y, label: d.label, value: v }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  const gridLines = [0, 25, 50, 75, 100].filter(g => g >= min && g <= max)

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {/* grid lines */}
      {gridLines.map((g, i) => {
        const gy = padding + innerH - ((g - min) / (max - min || 1)) * innerH
        return <line key={i} x1={padding} x2={padding + innerW} y1={gy} y2={gy} stroke="#e6e6e6" strokeWidth={1} />
      })}

      {/* path */}
      <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

      {/* area fill */}
      <path d={`${pathD} L ${padding + innerW} ${padding + innerH} L ${padding} ${padding + innerH} Z`} fill="rgba(59,130,246,0.08)" />

      {/* points */}
      {points.map(p => (
        <g key={p.x}>
          <circle cx={p.x} cy={p.y} r={3.5} fill="#fff" stroke="#3b82f6" strokeWidth={2} />
        </g>
      ))}

      {/* x labels */}
      {points.map((p, i) => (
        <text key={i} x={p.x} y={padding + innerH + 18} fontSize="10" textAnchor="middle" fill="#6b7280">{p.label.slice(5)}</text>
      ))}

      {/* y labels */}
      {gridLines.map((g, i) => {
        const gy = padding + innerH - ((g - min) / (max - min || 1)) * innerH
        return <text key={i} x={6} y={gy + 4} fontSize="10" fill="#9ca3af">{g}%</text>
      })}
    </svg>
  )
}
