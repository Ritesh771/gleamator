import React, { useEffect, useState } from 'react'
import { useAuth } from '../../lib/auth'
import api from '../../lib/api'
import StatsCard from '../../components/StatsCard'
import Alert from '../../components/Alert'

export default function StudentMarks() {
  const { user } = useAuth()
  const [marks, setMarks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { if (user) fetchMarks() }, [user])

  async function fetchMarks() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`marks/student/${user.id}/`)
      const list = (res.data && (res.data.marks || res.data.results)) || []
      setMarks(list)
    } catch (e) {
      console.error('load marks failed', e)
      setError('Failed to load marks')
    } finally { setLoading(false) }
  }

  const avgPercent = marks.length ? Math.round((marks.reduce((s, m) => {
    const got = Number(m.marks_obtained || 0)
    const max = Number(m.max_marks || (m.total_marks || 100))
    return s + (max ? (got / max) * 100 : 0)
  }, 0) / marks.length)) : null

  const spark = marks.slice(-12).map(m => {
    const got = Number(m.marks_obtained || 0)
    const max = Number(m.max_marks || (m.total_marks || 100))
    return max ? Math.round((got / max) * 100) : 0
  })

  return (
    <div style={{ padding: 24 }}>
      <h2>My Marks</h2>
      {error && <Alert>{error}</Alert>}
      {loading && <div>Loading...</div>}

      <div className="stats-grid" style={{ marginBottom: 18 }}>
        <StatsCard title="Average" value={avgPercent != null ? `${avgPercent}%` : '—'} meta={marks.length ? `${marks.length} exams` : ''} spark={spark} />
        <StatsCard title="Exams" value={String(marks.length)} meta="Total exams" />
      </div>

      <section>
        <h3>Marks Details</h3>
        {marks.length === 0 ? (
          <div>No marks available.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Subject</th><th>Marks</th><th>Max</th><th>%</th></tr>
              </thead>
              <tbody>
                {marks.map(m => {
                  const got = Number(m.marks_obtained || 0)
                  const max = Number(m.max_marks || (m.total_marks || ''))
                  const pct = max ? Math.round((got / max) * 100) : ''
                  return (
                    <tr key={m.id}>
                      <td>{m.subject_name || (m.subject && m.subject.name) || ''}</td>
                      <td>{m.marks_obtained}</td>
                      <td>{max || ''}</td>
                      <td>{pct !== '' ? `${pct}%` : ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
