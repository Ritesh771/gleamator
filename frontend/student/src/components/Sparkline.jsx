import React, { useRef, useEffect } from 'react'

export default function Sparkline({ data = [], width = 120, height = 28, color = '#4caf50' }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const len = data.length
  const step = width / Math.max(1, len - 1)
  const d = data.map((dval, i) => {
    const v = max === min ? height / 2 : height - ((dval - min) / (max - min)) * height
    return `${i === 0 ? 'M' : 'L'} ${i * step} ${v}`
  }).join(' ')

  const pathRef = useRef(null)
  useEffect(() => {
    const path = pathRef.current
    if (!path) return
    // respect reduced motion
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    try {
      const total = path.getTotalLength()
      path.style.strokeDasharray = `${total}`
      if (reduce) {
        path.style.strokeDashoffset = '0'
        path.style.transition = 'none'
      } else {
        path.style.strokeDashoffset = `${total}`
        // trigger layout then animate
        // eslint-disable-next-line no-unused-expressions
        path.getBoundingClientRect()
        path.style.transition = 'stroke-dashoffset 900ms cubic-bezier(.2,.9,.2,1)'
        path.style.strokeDashoffset = '0'
      }
    } catch (e) {
      // fallback: do nothing
    }
  }, [d])

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <path ref={pathRef} d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
