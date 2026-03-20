import React from 'react'
import Sparkline from './Sparkline'
import CircleDistribution from './CircleDistribution'

export default function StatsCard({ title, value, meta, spark = [], variant = 'default', icon = null, className = '', chartType = 'spark', chartValue = null }) {
  return (
    <div className={`stat-card stat-card--${variant} ${className}`}> 
      <div className="stat-card-head">
        {icon && <div className="stat-icon" aria-hidden>{icon}</div>}
        <div>
          <div className="stat-title">{title}</div>
          <div className="stat-value">{value}</div>
        </div>
      </div>

      {chartType === 'circle' ? (
        <div style={{ marginTop: 10 }}>
          <CircleDistribution value={chartValue != null ? chartValue : 0} size={72} />
        </div>
      ) : (
        spark && spark.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <Sparkline data={spark} width={180} height={36} color="#7c3aed" />
          </div>
        )
      )}

      {meta && <div className="stat-meta">{meta}</div>}
    </div>
  )
}
