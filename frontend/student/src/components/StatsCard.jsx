import React from 'react'
import Sparkline from './Sparkline'

export default function StatsCard({ title, value, meta, spark = [] }) {
  return (
    <div className="stat-card">
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value}</div>
      {spark && spark.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <Sparkline data={spark} width={180} height={36} color="#7c3aed" />
        </div>
      )}
      {meta && <div className="stat-meta">{meta}</div>}
    </div>
  )
}
