import React, { useEffect, useState } from 'react'
import api from '../../lib/api'

export default function Students() {
  const [students, setStudents] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch()
  }, [page])

  async function fetch() {
    setLoading(true)
    try {
      const res = await api.get('students/', { params: { page, page_size: pageSize } })
      setStudents(res.data.results || res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Students</h2>
      {loading && <div>Loading...</div>}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Roll</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{s.name || `${s.first_name} ${s.last_name}`}</td>
              <td>{s.roll_number || s.reg_no || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
        <span style={{ margin: '0 8px' }}>Page {page}</span>
        <button onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  )
}
