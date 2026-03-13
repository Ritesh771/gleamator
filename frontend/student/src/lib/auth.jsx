import React, { createContext, useContext, useState, useEffect } from 'react'
import api from './api'

const AuthContext = createContext(null)

let refreshPromise = null
let lastFailedRefreshAt = 0

export function AuthProvider({ children }) {
  const [access, setAccess] = useState(null)
  const [user, setUser] = useState(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    const storedRefresh = localStorage.getItem('refresh')
    if (!access && storedRefresh) {
      // try to obtain new access on load
      refreshToken().catch(() => {
        localStorage.removeItem('refresh')
      }).finally(() => setInitializing(false))
    }
    else {
      setInitializing(false)
    }
  }, [])

  function saveTokens({ access: newAccess, refresh }) {
    if (newAccess) setAccess(newAccess)
    if (newAccess) {
      try {
        const payload = parseJwt(newAccess)
        setUser({ id: payload.user_id || payload.sub, username: payload.username || payload.user, role: payload.role })
      } catch (e) {
        // ignore
      }
    }
    if (refresh) localStorage.setItem('refresh', refresh)
  }

  async function login(username, password) {
    const res = await api.post('login/', { username, password })
    const tokens = res.data
    saveTokens(tokens)
    // decode basic info from access if desired (optional)
    // user is set from the access token in saveTokens; do not overwrite it here
    setInitializing(false)
    return tokens
  }

  async function logout() {
    setAccess(null)
    setUser(null)
    localStorage.removeItem('refresh')
    setInitializing(false)
  }

  async function refreshToken() {
    const refresh = localStorage.getItem('refresh')
    const now = Date.now()
    // if we recently failed, short-circuit to avoid spamming the server
    if (lastFailedRefreshAt && (now - lastFailedRefreshAt) < 30000) {
      throw new Error('recent refresh failure, backing off')
    }
    if (!refresh) throw new Error('no refresh')
    if (!refreshPromise) {
      refreshPromise = api.post('token/refresh/', { refresh }).then((r) => {
        const tokens = r.data
        saveTokens(tokens)
        refreshPromise = null
        return tokens
      }).catch((err) => {
        // set backoff marker so we don't retry immediately
        lastFailedRefreshAt = Date.now()
        refreshPromise = null
        throw err
      })
    }
    return refreshPromise
  }

  // attach interceptors to api
  useEffect(() => {
    const req = api.interceptors.request.use((cfg) => {
      if (access) cfg.headers.Authorization = `Bearer ${access}`
      return cfg
    })

    const res = api.interceptors.response.use(
      (r) => r,
      async (error) => {
        const original = error.config
        if (error.response && error.response.status === 401 && !original._retry) {
          original._retry = true
          try {
            const tokens = await refreshToken()
            api.defaults.headers.common.Authorization = `Bearer ${tokens.access}`
            original.headers.Authorization = `Bearer ${tokens.access}`
            setAccess(tokens.access)
            try {
              const payload = parseJwt(tokens.access)
              setUser({ id: payload.user_id || payload.sub, username: payload.username || payload.user, role: payload.role })
            } catch (e) {}
            return api(original)
          } catch (e) {
            await logout()
            return Promise.reject(e)
          }
        }
        return Promise.reject(error)
      }
    )

    return () => {
      api.interceptors.request.eject(req)
      api.interceptors.response.eject(res)
    }
  }, [access])

  return (
    <AuthContext.Provider value={{ access, user, login, logout, refreshToken, initializing }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

function parseJwt(token) {
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = parts[1]
    // base64url -> base64
    let b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    // pad with =
    const pad = b64.length % 4
    if (pad) {
      b64 += '='.repeat(4 - pad)
    }
    const decoded = atob(b64)
    return JSON.parse(decoded)
  } catch (e) {
    return null
  }
}
