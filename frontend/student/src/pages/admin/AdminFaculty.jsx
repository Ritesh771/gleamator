import React, { useEffect, useState } from 'react'
import api from '../../lib/api'
import Alert from '../../components/Alert'

export default function AdminFaculty() {
  const [faculty, setFaculty] = useState([])
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [dept, setDept] = useState('')
  const [departments, setDepartments] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => { fetchFaculty(); fetchDepartments() }, [])

  async function fetchFaculty() {
    try {
      const res = await api.get('faculty/')
      setFaculty(res.data.results || res.data)
    } catch (e) { setError('Failed to load faculty') }
  }

  async function fetchDepartments() {
    try {
      const res = await api.get('departments/')
      setDepartments(res.data.results || res.data)
    } catch (e) { }
  }

  async function createFaculty(e) {
    e.preventDefault()
    setError(null)
    if (!username.trim() || !password) { setError('Username and password required'); return }
    if (email && !email.includes('@')) { setError('Invalid email'); return }
    try {
      // create faculty using backend faculty endpoint
      await api.post('faculty/', { username: username.trim(), password, first_name: firstName, last_name: lastName, email, department_id: dept })
      setFirstName(''); setLastName(''); setEmail(''); setUsername(''); setPassword(''); setDept('')
      fetchFaculty()
    } catch (err) {
      setError('Create failed')
    }
  }

  async function deleteFaculty(id) {
    if (!confirm('Delete faculty?')) return
    try {
      await api.delete(`faculty/${id}/`)
      fetchFaculty()
    } catch (e) { setError('Delete failed') }
  }

  function startEdit(f) {
    f._editing = true
    setFaculty([...faculty])
  }

  async function saveEdit(f) {
    if (!f.first_name && !f.username) { setError('Name or username required'); return }
    try {
      await api.put(`faculty/${f.id}/`, { first_name: f.first_name, last_name: f.last_name, email: f.email })
      f._editing = false
      setFaculty([...faculty])
    } catch (e) { setError('Update failed') }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Faculty (Admin)</h2>
      {error && <Alert>{error}</Alert>}
      <form onSubmit={createFaculty} style={{ marginBottom: 12 }}>
        <input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <select value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="">-- department (optional) --</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button type="submit">Create Faculty</button>
      </form>

      <h3>Existing Faculty</h3>
      <ul>
        {(faculty || []).map((f) => (
          <li key={f.id} style={{ marginBottom: 8 }}>
            {f._editing ? (
              <>
                <input value={f.first_name || ''} onChange={(e) => { f.first_name = e.target.value; setFaculty([...faculty]) }} />
                <input value={f.last_name || ''} onChange={(e) => { f.last_name = e.target.value; setFaculty([...faculty]) }} />
                <input value={f.email || ''} onChange={(e) => { f.email = e.target.value; setFaculty([...faculty]) }} />
                <button onClick={() => saveEdit(f)}>Save</button>
                <button onClick={() => { f._editing = false; setFaculty([...faculty]) }}>Cancel</button>
              </>
            ) : (
              <>
                {f.first_name || f.username} {f.last_name || ''} <button onClick={() => startEdit(f)}>Edit</button> <button onClick={() => deleteFaculty(f.id)}>Delete</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
