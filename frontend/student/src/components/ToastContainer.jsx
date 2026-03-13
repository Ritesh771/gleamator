import React, { useEffect, useState } from 'react'
import { subscribe } from '../lib/toastService'

export default function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    return subscribe((t) => {
      const id = String(Date.now()) + Math.random().toString(36).slice(2,8)
      setToasts((s) => [...s, { ...t, id }])
      // auto-remove after duration
      setTimeout(() => { setToasts((s) => s.filter(x => x.id !== id)) }, (t.duration || 3500))
    })
  }, [])

  return (
    <div style={{ position: 'fixed', right: 18, top: 18, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map((t) => (
        <div key={t.id} style={{ minWidth: 220, padding: '10px 14px', borderRadius: 8, background: t.type === 'error' ? '#fff1f0' : '#f0fff4', color: t.type === 'error' ? '#7f1d1d' : '#064e3b', boxShadow: '0 6px 20px rgba(16,24,40,0.08)', border: '1px solid rgba(0,0,0,0.04)' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{t.title || (t.type === 'error' ? 'Error' : 'Success')}</div>
          <div style={{ fontSize: 13 }}>{t.message}</div>
        </div>
      ))}
    </div>
  )
}
