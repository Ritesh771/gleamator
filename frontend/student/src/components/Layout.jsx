import React from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import ToastContainer from './ToastContainer'

export default function Layout({ children }) {
  return (
    <div className="app-root">
      <Sidebar />
      <div className="app-main">
        <Header />
        <ToastContainer />
        <main className="app-content">{children}</main>
      </div>
    </div>
  )
}
