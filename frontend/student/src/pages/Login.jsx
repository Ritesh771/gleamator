import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
          <div className="hero-copy">
            <h1>Gleamator Campus ERP</h1>
            <div className="hero-illustration-wrapper">
              <img src="/Company-cuate.svg" alt="Gleamator" className="hero-illustration" />
            </div>
            <p>Secure campus management for students, faculty, and administrators.</p>
            <ul className="hero-features">
              <li>Student & Faculty Dashboards</li>
              <li>Attendance, Marks & Reporting</li>
              <li>Role-based Access and Admin Tools</li>
            </ul>
            <p className="hero-footer">
              <img src="/Gleamator-Logo-Transparent.png" alt="Gleamator" className="hero-logo-small" />
              <span>Built by <a href="https://riteshn.me" target="_blank" rel="noopener noreferrer">Ritesh</a></span>
            </p>
          </div>
        </div>
      </div>
      <div className="auth-right">
          <img src="/Gleamator-Logo-Transparent.png" alt="Gleamator" className="login-logo-large" />
        <div className="login-card">
          <h2 style={{ textAlign: 'center', margin: '0 0 8px 0' }}>Login</h2>
          <div style={{ color: 'var(--muted)', marginBottom: 8, textAlign: 'center' }}>Sign in to access your account</div>
          {error && <Alert>{error}</Alert>}
          <form onSubmit={submit} className="login-form">
            <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <div className="login-meta">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" /> Remember 
              </label>
              <Link className="forgot" to="/forgot-password">Forgot Password?</Link>
            </div>
            <button type="submit">Login</button>
          </form>
        </div>
      </div>
    </div>
  )
}
