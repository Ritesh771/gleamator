import React, { useEffect, useState } from 'react'
import api from '../../lib/api'
import Alert from '../../components/Alert'

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([])
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { fetchDepartments() }, [])

  async function fetchDepartments() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('departments/')
      setDepartments(res.data.results || res.data)
    } catch (e) { setError('Failed to load departments') }
    finally { setLoading(false) }
  }

  async function createDept(e) {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !code.trim()) { setError('Name and code required'); return }
    try {
      await api.post('departments/', { name: name.trim(), code: code.trim() })
      setName('')
      setCode('')
      fetchDepartments()
    } catch (err) {
      setError('Create failed')
    }
  }

  async function deleteDept(id) {
    if (!confirm('Delete department?')) return
    try {
      await api.delete(`departments/${id}/`)
      fetchDepartments()
    } catch (e) { setError('Delete failed') }
  }

  async function startEdit(d) {
    d._editing = true
    setDepartments([...departments])
  }

  async function saveEdit(d) {
    if (!d.name || !d.code) { setError('Name and code required'); return }
    try {
      await api.put(`departments/${d.id}/`, { name: d.name, code: d.code })
      d._editing = false
      setDepartments([...departments])
    } catch (e) { setError('Update failed') }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Departments (Admin)</h2>
      {error && <Alert>{error}</Alert>}
      <form onSubmit={createDept} style={{ marginBottom: 12 }}>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} />
        <button type="submit">Create</button>
      </form>
      {loading && <div>Loading...</div>}
      <ul>
        {departments.map((d) => (
          <li key={d.id} style={{ marginBottom: 8 }}>
            {d._editing ? (
              <>
                <input value={d.name} onChange={(e) => { d.name = e.target.value; setDepartments([...departments]) }} />
                <input value={d.code} onChange={(e) => { d.code = e.target.value; setDepartments([...departments]) }} />
                <button onClick={() => saveEdit(d)}>Save</button>
                <button onClick={() => { d._editing = false; setDepartments([...departments]) }}>Cancel</button>
              </>
            ) : (
              <>
                {d.name} ({d.code}) <button onClick={() => startEdit(d)}>Edit</button> <button onClick={() => deleteDept(d.id)}>Delete</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
