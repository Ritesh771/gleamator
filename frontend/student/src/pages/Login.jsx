import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import Alert from '../components/Alert'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const auth = useAuth()
  const navigate = useNavigate()

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!username.trim() || !password) { setError('Username and password required'); return }
    try {
      await auth.login(username.trim(), password)
      navigate('/')
    } catch (err) {
      setError('Login failed — check credentials')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="hero">
          <img src="/Company-cuate.svg" alt="Gleamator" style={{ width: 180, marginBottom: 18 }} />
          <h1>Gleamator Campus ERP</h1>
          <p>Secure campus management for students, faculty, and administrators.</p>
          <ul className="hero-features">
            <li>Student & Faculty Dashboards</li>
            <li>Attendance, Marks & Reporting</li>
            <li>Role-based Access and Admin Tools</li>
          </ul>
          <p style={{ marginTop: 18, opacity: 0.9, display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/Gleamator-Logo-Transparent.png" alt="Gleamator" style={{ width: 22 }} />
            <span>Built by Ritesh N</span>
          </p>
        </div>
      </div>
      <div className="auth-right">
        <div className="login-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/Gleamator-Logo-Transparent.png" alt="Gleamator" style={{ width: 36 }} />
            <h2>Login</h2>
          </div>
          <div style={{ color: 'var(--muted)', marginBottom: 8 }}>Sign in to access your account</div>
          {error && <Alert>{error}</Alert>}
          <form onSubmit={submit} className="login-form">
            <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <div className="login-meta">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" /> Remember 
              </label>
              <a className="forgot" href="#">Forgot Password?</a>
            </div>
            <button type="submit">Login</button>
          </form>
        </div>
      </div>
    </div>
  )
}
