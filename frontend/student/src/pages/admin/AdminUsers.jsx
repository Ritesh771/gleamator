import React, { useEffect, useState } from 'react'
import api from '../../lib/api'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('STUDENT')

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    try {
      const res = await api.get('users/')
      setUsers(res.data.results || res.data)
    } catch (e) { console.error(e) }
  }

  async function createUser(e) {
    e.preventDefault()
    try {
      await api.post('register/', { username, password, role })
      setUsername('')
      setPassword('')
      fetchUsers()
    } catch (err) {
      console.error(err)
      alert('Failed')
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Admin - Users</h2>
      <form onSubmit={createUser}>
        <div>
          <input placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="STUDENT">STUDENT</option>
            <option value="FACULTY">FACULTY</option>
            <option value="HOD">HOD</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <button type="submit">Create</button>
        </div>
      </form>

      <h3>Existing Users</h3>
      <ul>
        {users.map((u) => <li key={u.id}>{u.username || `${u.first_name} ${u.last_name}`}</li>)}
      </ul>
    </div>
  )
}
