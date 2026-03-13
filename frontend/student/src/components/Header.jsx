import React from 'react'
import { useAuth } from '../lib/auth'

export default function Header() {
  const { user, logout } = useAuth()
  return (
    <header className="app-header">
      <div className="brand">Gleamator Technology ERP</div>
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
