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
          <h1>Welcome to NEURO CAMPUS</h1>
          <p>Login to access your Campus portal — AI-powered campus management for students, faculty, and administration.</p>
          <p style={{ marginTop: 18, opacity: 0.95 }}>Developed under Gleamator Technology</p>
        </div>
      </div>
      <div className="auth-right">
        <div className="login-card">
          <h2>Login</h2>
          <div style={{ color: 'var(--muted)', marginBottom: 8 }}>Sign in to access your account</div>
          {error && <Alert>{error}</Alert>}
          <form onSubmit={submit} className="login-form">
            <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <div className="login-meta">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" /> Remember me
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
