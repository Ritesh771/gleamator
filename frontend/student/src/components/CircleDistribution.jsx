import React from 'react'

export default function CircleDistribution({ value = 0, size = 72, stroke = 8, colors = ['#7c3aed', '#0ea5e9'] }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  const dash = (pct / 100) * circumference

  return (
    <div style={{ width: size, height: size, display: 'inline-block' }} aria-hidden>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="cd-grad" x1="0%" x2="100%">
            <stop offset="0%" stopColor={colors[0]} />
            <stop offset="100%" stopColor={colors[1]} />
          </linearGradient>
        </defs>
        <g transform={`translate(${size/2}, ${size/2})`}>
          <circle r={radius} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={stroke} />
          <circle
            r={radius}
            fill="none"
            stroke="url(#cd-grad)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-circumference * 0.25}
            transform="rotate(-90)"
          />
        </g>
      </svg>
      <div style={{ position: 'relative', marginTop: -size, width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ fontWeight: 800, color: '#0f172a' }}>{String(pct)}{typeof value === 'number' ? '%' : ''}</div>
      </div>
    </div>
  )
}
