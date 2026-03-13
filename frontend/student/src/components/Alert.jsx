import React from 'react'

export default function Alert({ type = 'error', children }) {
  const style = {
    padding: '8px 12px',
    borderRadius: 4,
    margin: '8px 0',
    color: type === 'error' ? '#8b0000' : '#0b6623',
    background: type === 'error' ? '#ffdede' : '#e6ffe6',
    border: `1px solid ${type === 'error' ? '#f5c2c2' : '#bdecb6'}`,
  }
  return <div style={style}>{children}</div>
}
