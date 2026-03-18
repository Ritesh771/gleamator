import React, { useEffect, useState } from 'react'
import api from '../../lib/api'
import LineChart from '../../components/LineChart'
import StatsCard from '../../components/StatsCard'

export default function Students() {
  const [students, setStudents] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [loading, setLoading] = useState(false)
  const [trends, setTrends] = useState([])
  const LOW_THRESHOLD = 75

  useEffect(() => {
    fetchStudents()
    fetchTrends()
  }, [page])

  async function fetchTrends() {
    try {
      const res = await api.get('faculty/attendance/trends/')
      const t = (res.data && res.data.trends) || []
      setTrends(t.map(item => ({ label: item.label, value: item.value })))
    } catch (e) {
      console.error('failed to load trends', e)
    }
  }

  async function fetchStudents() {
    setLoading(true)
    try {
      const res = await api.get('students/', { params: { page, page_size: pageSize } })
      const list = res.data.results || res.data || []

      // fetch per-student attendance summaries in parallel
      const details = await Promise.all(list.map(async (s) => {
        try {
          const r = await api.get(`attendance/student/${s.id}/`)
          const att = r.data && r.data.attendance ? r.data.attendance : []
          const vals = att.map(a => a.attendance_percent).filter(v => v != null)
          const avg = vals.length ? Math.round(vals.reduce((a,b) => a+b, 0) / vals.length) : null
          return { ...s, attendance_percent: avg }
        } catch (e) {
          return { ...s, attendance_percent: null }
        }
      }))

      setStudents(details)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Attendance Records</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 20, alignItems: 'start', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <StatsCard title="Students (page)" value={students.length} meta={`Page ${page}`} />
          <StatsCard title="Low attendance" value={students.filter(s => s.attendance_percent != null && s.attendance_percent < LOW_THRESHOLD).length} variant="warning" />
        </div>

        <div style={{ background: '#fff', border: '1px solid #e6e6e6', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 14, color: '#111827', fontWeight: 600, marginBottom: 8 }}>Attendance (last 7 days)</div>
          <LineChart data={trends} width={420} height={160} />
        </div>
      </div>

      {loading && <div>Loading...</div>}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
            <th style={{ padding: 8 }}>ID</th>
            <th style={{ padding: 8 }}>Name</th>
            <th style={{ padding: 8 }}>Roll</th>
            <th style={{ padding: 8 }}>Attendance %</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6', color: (s.attendance_percent != null && s.attendance_percent < LOW_THRESHOLD) ? '#dc2626' : 'inherit' }}>
              <td style={{ padding: 8 }}>{s.id}</td>
              <td style={{ padding: 8 }}>{s.name || `${s.first_name || ''} ${s.last_name || ''}`}</td>
              <td style={{ padding: 8 }}>{s.roll_number || s.reg_no || ''}</td>
              <td style={{ padding: 8 }}>{s.attendance_percent != null ? `${s.attendance_percent}%` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 12 }}>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
        <span style={{ margin: '0 8px' }}>Page {page}</span>
        <button onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  )
}
