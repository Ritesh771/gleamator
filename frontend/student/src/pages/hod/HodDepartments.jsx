import React, { useEffect, useState, useRef } from 'react'
import api from '../../lib/api'
import { useAuth } from '../../lib/auth'

export default function HodDepartments() {
  const { user } = useAuth()
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [dept, setDept] = useState(null)

  // users in department: faculty + students
  const [faculty, setFaculty] = useState([])
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const searchTimer = useRef(null)

  useEffect(() => { if (user) fetchDepartments() }, [user])
  useEffect(() => { if (dept) fetchDeptUsers() }, [dept])
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { if (dept) fetchDeptUsers() }, 360)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search, roleFilter])

  async function fetchDepartments() {
    setLoading(true)
    try {
      const res = await api.get('departments/')
      const list = res.data.results || res.data || []
      setDepartments(list)
      const my = list.find((d) => {
        const h = d.hod
        if (!h || !user) return false
        if (typeof h === 'object' && h.id != null) return String(h.id) === String(user.id)
        return String(h) === String(user.id) || String(h) === String(user.username)
      })
      if (my) setDept(my)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function fetchDeptUsers() {
    try {
      const params = {}
      if (search) params.search = search
      // fetch faculty
      const f = await api.get('faculty/', { params: { ...params, department: dept.code } })
      setFaculty(f.data.results || f.data || [])
      // fetch students
      const s = await api.get('students/', { params: { ...params, department: dept.code, page_size: 200 } })
      setStudents(s.data.results || s.data || [])
    } catch (e) { console.error(e) }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Departments</h2>
      {loading && <div>Loading...</div>}
      {dept ? (
        <div>
          <h3>{dept.name} ({dept.code})</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <input placeholder="Search users" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All</option>
              <option value="FACULTY">Faculty</option>
              <option value="STUDENT">Students</option>
            </select>
          </div>

          {roleFilter !== 'STUDENT' && (
            <div>
              <h4>Faculty</h4>
              <ul>
                {faculty.map((f) => (<li key={f.id}>{f.user?.first_name || f.first_name} {f.user?.last_name || f.last_name} ({f.user?.username || ''})</li>))}
              </ul>
            </div>
          )}

          {roleFilter !== 'FACULTY' && (
            <div>
              <h4>Students</h4>
              <ul>
                {students.map((s) => (<li key={s.id}>{s.user?.first_name || s.first_name} {s.user?.last_name || s.last_name} — {s.usn || s.roll_number || s.reg_no}</li>))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p>No department assigned to your HOD account. Contact admin.</p>
          <ul>
            {departments.map((d) => (
              <li key={d.id}>{d.name} ({d.code})</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
