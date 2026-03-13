import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/auth'

function Icon({ name }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (name === 'home') return (
    <svg {...common}><path d="M3 11.5L12 4l9 7.5"/><path d="M5 21V10.5h14V21"/></svg>
  )
  if (name === 'users') return (
    <svg {...common}><path d="M17 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><path d="M9 7a4 4 0 1 1 8 0"/></svg>
  )
  if (name === 'departments') return (
    <svg {...common}><path d="M3 7h18v14H3z"/><path d="M7 7v14"/></svg>
  )
  if (name === 'faculty') return (
    <svg {...common}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"/><path d="M6 20v-1a6 6 0 0 1 12 0v1"/></svg>
  )
  if (name === 'hod') return (
    <svg {...common}><path d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4z"/></svg>
  )
  if (name === 'students') return (
    <svg {...common}><path d="M12 12c2.21 0 4-1.79 4-4S14.21 4 12 4s-4 1.79-4 4 1.79 4 4 4z"/><path d="M4 20v-1a8 8 0 0 1 16 0v1"/></svg>
  )
  if (name === 'attendance') return (
    <svg {...common}><path d="M9 11l2 2 4-4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3"/></svg>
  )
  if (name === 'marks') return (
    <svg {...common}><path d="M12 20v-6"/><path d="M8 12h8"/><path d="M6 4h12v6H6z"/></svg>
  )
  if (name === 'profile') return (
    <svg {...common}><circle cx="12" cy="8" r="3"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/></svg>
  )
  return null
}

export default function Sidebar() {
  const { user } = useAuth()
  

  return (
    <aside className={`app-sidebar`}>
      <div className={`sidebar-inner`}>
        <div className="sidebar-top">
          <h3 className="sidebar-title"></h3>
        </div>
        {user && <div className="sidebar-greeting">Hi, {user.username}</div>}
        <nav>
          <ul className="sidebar-nav">
            <li><NavLink to="/" className={({isActive})=> isActive ? 'sidebar-link active' : 'sidebar-link'}><span className="icon"><Icon name="home"/></span><span className="label">Home</span></NavLink></li>
            {user?.role === 'ADMIN' && (
              <>
                <li><NavLink to="/admin/users" className={({isActive})=> isActive ? 'sidebar-link active' : 'sidebar-link'}><span className="icon"><Icon name="users"/></span><span className="label">Users</span></NavLink></li>
                <li><NavLink to="/admin/departments" className={({isActive})=> isActive ? 'sidebar-link active' : 'sidebar-link'}><span className="icon"><Icon name="departments"/></span><span className="label">Departments</span></NavLink></li>
                <li><NavLink to="/admin/faculty" className={({isActive})=> isActive ? 'sidebar-link active' : 'sidebar-link'}><span className="icon"><Icon name="faculty"/></span><span className="label">Faculty</span></NavLink></li>
                <li><NavLink to="/admin/hods" className={({isActive})=> isActive ? 'sidebar-link active' : 'sidebar-link'}><span className="icon"><Icon name="hod"/></span><span className="label">HODs</span></NavLink></li>
              </>
            )}
            {user?.role === 'HOD' && (
              <>
                <li><NavLink to="/hod/departments" className={({isActive})=> isActive ? 'sidebar-link active' : 'sidebar-link'}><span className="icon"><Icon name="departments"/></span><span className="label">Departments</span></NavLink></li>
                <li><NavLink to="/students" className={({isActive})=> isActive ? 'sidebar-link active' : 'sidebar-link'}><span className="icon"><Icon name="students"/></span><span className="label">Students</span></NavLink></li>
              </>
            )}
            {user?.role === 'FACULTY' && (
              <>
                <li><NavLink to="/attendance/take" className={({isActive})=> isActive ? 'sidebar-link active' : 'sidebar-link'}><span className="icon"><Icon name="attendance"/></span><span className="label">Take Attendance</span></NavLink></li>
                <li><NavLink to="/marks/upload" className={({isActive})=> isActive ? 'sidebar-link active' : 'sidebar-link'}><span className="icon"><Icon name="marks"/></span><span className="label">Upload Marks</span></NavLink></li>
                <li><NavLink to="/students" className={({isActive})=> isActive ? 'sidebar-link active' : 'sidebar-link'}><span className="icon"><Icon name="students"/></span><span className="label">Students</span></NavLink></li>
              </>
            )}
            {user?.role === 'STUDENT' && (
              <>
                <li><NavLink to="/student/profile" className={({isActive})=> isActive ? 'sidebar-link active' : 'sidebar-link'}><span className="icon"><Icon name="profile"/></span><span className="label">My Profile</span></NavLink></li>
                <li><NavLink to="/student/attendance" className={({isActive})=> isActive ? 'sidebar-link active' : 'sidebar-link'}><span className="icon"><Icon name="students"/></span><span className="label">My Attendance</span></NavLink></li>
                <li><NavLink to="/student/marks" className={({isActive})=> isActive ? 'sidebar-link active' : 'sidebar-link'}><span className="icon"><Icon name="marks"/></span><span className="label">My Marks</span></NavLink></li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </aside>
  )
}
