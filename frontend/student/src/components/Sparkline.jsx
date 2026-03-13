import React from 'react'

export default function Sparkline({ data = [], width = 120, height = 28, color = '#4caf50' }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const len = data.length
  const step = width / Math.max(1, len - 1)
  const points = data.map((d, i) => {
    const v = max === min ? height / 2 : height - ((d - min) / (max - min)) * height
    return `${i * step},${v}`
  }).join(' ')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
