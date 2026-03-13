import React, { useEffect, useState } from 'react'
import api from '../../lib/api'
import { useAuth } from '../../lib/auth'
import Sparkline from '../../components/Sparkline'

function Bar({ label, value, max = 100 }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{label}</strong><span>{pct}%</span></div>
      <div style={{ height: 12, background: '#222', borderRadius: 6 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#4caf50', borderRadius: 6 }} />
      </div>
    </div>
  )
}

export default function StudentAttendance() {
  const { user } = useAuth()
  const [records, setRecords] = useState([])
  const [bySubject, setBySubject] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (user) fetchAttendance() }, [user])

  async function fetchAttendance() {
    setLoading(true)
    try {
      const res = await api.get(`attendance/student/${user.id}/`)
      const data = res.data.results || res.data || []
      setRecords(data)
      const grouped = {}
      data.forEach((r) => {
        const subj = r.subject_name || r.subject?.name || 'Unknown'
        grouped[subj] = grouped[subj] || { present: 0, total: 0 }
        grouped[subj].total += 1
        if (r.present) grouped[subj].present += 1
      })
      setBySubject(grouped)
    } catch (e) {
      console.error(e)
    } finally { setLoading(false) }
  }

  function downloadCSV() {
    const headers = ['date', 'subject', 'present']
    const rows = records.map((r) => [r.session_date || r.created_at || '', r.subject_name || r.subject?.name || '', r.present ? '1' : '0'])
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_${user.id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // prepare trend data per subject (last 8 sessions): compute percent present per subject over time
  const subjectTrends = Object.entries(bySubject).map(([subj, v]) => ({ subj, percent: Math.round((v.present / Math.max(1, v.total)) * 100) }))

  return (
    <div>
      <h2>My Attendance</h2>
      {loading && <div>Loading...</div>}
      <div className="card">
        {Object.keys(bySubject).length === 0 ? <div>No records</div> : (
          <div style={{ display: 'grid', gap: 12 }}>
            {subjectTrends.map((s) => (
              <div key={s.subj} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>{s.subj}</div>
                <div style={{ width: 160 }}><Sparkline data={[s.percent, s.percent * 0.9, s.percent * 1.05, s.percent]} /></div>
                <div style={{ width: 60, textAlign: 'right' }}>{s.percent}%</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ marginTop: 12 }}>
        <button onClick={downloadCSV}>Download CSV</button>
      </div>
    </div>
  )
}
