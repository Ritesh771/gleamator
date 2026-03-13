import React, { useEffect, useState } from 'react'
import api from '../../lib/api'

export default function HodDepartments() {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchDepartments() }, [])

  async function fetchDepartments() {
    setLoading(true)
    try {
      const res = await api.get('departments/')
      setDepartments(res.data.results || res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Departments</h2>
      {loading && <div>Loading...</div>}
      <ul>
        {departments.map((d) => (
          <li key={d.id}>{d.name} ({d.code})</li>
        ))}
      </ul>
    </div>
  )
}
