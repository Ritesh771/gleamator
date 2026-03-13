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
        <div style={{ width: `${pct}%`, height: '100%', background: '#2196f3', borderRadius: 6 }} />
      </div>
    </div>
  )
}

export default function StudentMarks() {
  const { user } = useAuth()
  const [marks, setMarks] = useState([])
  const [grouped, setGrouped] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (user) fetchMarks() }, [user])

  async function fetchMarks() {
    setLoading(true)
    try {
      const res = await api.get(`marks/student/${user.id}/`)
      const data = res.data.results || res.data || []
      setMarks(data)
      const g = data.map((m) => ({ subject: m.subject_name || m.subject?.name || 'Unknown', value: Number(m.marks_obtained || 0), max: Number(m.max_marks || 100) }))
      setGrouped(g)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const rows = grouped.map((g) => g.value)

  return (
    <div>
      <h2>My Marks</h2>
      {loading && <div>Loading...</div>}
      <div className="card">
        {grouped.length === 0 ? <div>No marks available</div> : (
          <div>
            {grouped.map((g, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>{g.subject}</div>
                <div style={{ width: 120 }}><Sparkline data={[g.value, Math.max(0, g.value - 5), g.value, Math.min(g.max || 100, g.value + 3)]} color="#2196f3" /></div>
                <div style={{ width: 80, textAlign: 'right' }}>{g.value}/{g.max}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <table>
        <thead><tr><th>Subject</th><th>Marks</th><th>Max</th></tr></thead>
        <tbody>
          {marks.map((m) => (<tr key={m.id}><td>{m.subject_name || m.subject?.name}</td><td>{m.marks_obtained}</td><td>{m.max_marks || ''}</td></tr>))}
        </tbody>
      </table>
    </div>
  )
}
