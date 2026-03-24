import React, { useEffect, useState } from 'react'
import { useAuth } from '../../lib/auth'
import api from '../../lib/api'
import Alert from '../../components/Alert'

export default function Leaderboard() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { if (user) fetchBoard() }, [user])

  async function fetchBoard() {
    setLoading(true)
    setError(null)
    try {
      // No params -> backend infers student's department/semester for STUDENT
      const res = await api.get('students/leaderboard/')
      const list = (res.data && (res.data.results || res.data)) || []
      setRows(list)
    } catch (e) {
      console.error('load leaderboard failed', e)
      setError('Failed to load leaderboard')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Leaderboard</h2>
      {error && <Alert>{error}</Alert>}
      {loading && <div>Loading...</div>}

      <section>
        {rows.length === 0 ? (
          <div>No leaderboard data.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Rank</th><th>Name</th><th>USN</th><th>%</th><th>Total</th></tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.student_id}>
                    <td>{r.rank}</td>
                    <td>{r.first_name} {r.last_name} ({r.username})</td>
                    <td>{r.usn || ''}</td>
                    <td>{r.percent != null ? `${r.percent}%` : '—'}</td>
                    <td>{r.total_obtained}/{r.total_max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
