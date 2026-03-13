import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './auth'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth()
  const { initializing } = useAuth()
  if (initializing) return null
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />
  return children
}
