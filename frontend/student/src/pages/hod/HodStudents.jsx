import React, { useEffect, useState } from 'react'
import api from '../../lib/api'
import { useAuth } from '../../lib/auth'

export default function HodStudents() {
  const { user } = useAuth()
  const [dept, setDept] = useState(null)
  const [students, setStudents] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchDept() }, [user])
  useEffect(() => { if (dept) fetchStudents() }, [dept, page, search])

  async function fetchDept() {
    try {
      const res = await api.get('departments/')
      const list = res.data.results || res.data || []
      const my = list.find((d) => {
        const h = d.hod
        if (!h || !user) return false
        if (typeof h === 'object' && h.id != null) return String(h.id) === String(user.id)
        return String(h) === String(user.id) || String(h) === String(user.username)
      })
      if (my) setDept(my)
    } catch (e) { console.error(e) }
  }

  async function fetchStudents() {
    if (!dept) return
    setLoading(true)
    try {
      const params = { department: dept.code, page, page_size: pageSize }
      if (search) params.search = search
      const res = await api.get('students/', { params })
      setStudents(res.data.results || res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Department Students{dept ? ` — ${dept.name}` : ''}</h2>
      {dept ? (
        <>
          <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input placeholder="Search students" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {loading && <div>Loading...</div>}
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>USN / Roll</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td>{s.user?.first_name || s.first_name} {s.user?.last_name || s.last_name}</td>
                  <td>{s.usn || s.roll_number || s.reg_no || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
            <span style={{ margin: '0 8px' }}>Page {page}</span>
            <button onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </>
      ) : (
        <div>No department assigned to your HOD account.</div>
      )}
    </div>
  )
}
