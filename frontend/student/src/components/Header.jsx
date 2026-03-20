import React from 'react'
import { useAuth } from '../lib/auth'

export default function Header() {
  const { user, logout } = useAuth()
  return (
    <header className="app-header">
      <div className="brand">
        <img src="/Gleamator-Logo-Transparent.png" className="brand-logo" alt="Gleamator" />
        <span className="brand-title">Growvo Campus</span>
      </div>
      <div className="header-actions">
        {user ? (
          <>
            <span className="user">{user.username} ({user.role})</span>
            <button className="btn small" onClick={() => logout()}>Logout</button>
          </>
        ) : (
          <span />
        )}
      </div>
    </header>
  )
}
