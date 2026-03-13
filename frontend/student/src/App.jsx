import React from 'react'
import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Students from './pages/common/Students'
import ProtectedRoute from './lib/ProtectedRoute'
import AdminDashboard from './pages/admin/AdminDashboard'
import HodDashboard from './pages/hod/HodDashboard'
import FacultyDashboard from './pages/faculty/FacultyDashboard'
import StudentDashboard from './pages/student/StudentDashboard'
import Layout from './components/Layout'
import TakeAttendance from './pages/attendance/TakeAttendance'
import UploadMarks from './pages/marks/UploadMarks'
import HodDepartments from './pages/hod/HodDepartments'
import HodFaculty from './pages/hod/HodFaculty'
import HodStudents from './pages/hod/HodStudents'
import AdminUsers from './pages/admin/AdminUsers'
import StudentProfile from './pages/student/StudentProfile'
import AdminDepartments from './pages/admin/AdminDepartments'
import AdminFaculty from './pages/admin/AdminFaculty'
import AdminHods from './pages/admin/AdminHods'
import StudentAttendance from './pages/student/StudentAttendance'
import StudentMarks from './pages/student/StudentMarks'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout><RoleHome /></Layout>} />
          <Route path="/login" element={<Login />} />
          <Route path="/students" element={<Layout><ProtectedRoute allowedRoles={["ADMIN","HOD","FACULTY"]}><Students /></ProtectedRoute></Layout>} />
          <Route path="/attendance/take" element={<Layout><ProtectedRoute allowedRoles={["FACULTY"]}><TakeAttendance /></ProtectedRoute></Layout>} />
          <Route path="/marks/upload" element={<Layout><ProtectedRoute allowedRoles={["FACULTY"]}><UploadMarks /></ProtectedRoute></Layout>} />
          <Route path="/hod/departments" element={<Layout><ProtectedRoute allowedRoles={["HOD"]}><HodDepartments /></ProtectedRoute></Layout>} />
          <Route path="/hod/faculty" element={<Layout><ProtectedRoute allowedRoles={["HOD"]}><HodFaculty /></ProtectedRoute></Layout>} />
          <Route path="/hod/students" element={<Layout><ProtectedRoute allowedRoles={["HOD"]}><HodStudents /></ProtectedRoute></Layout>} />
          <Route path="/admin/users" element={<Layout><ProtectedRoute allowedRoles={["ADMIN"]}><AdminUsers /></ProtectedRoute></Layout>} />
          <Route path="/admin/departments" element={<Layout><ProtectedRoute allowedRoles={["ADMIN"]}><AdminDepartments /></ProtectedRoute></Layout>} />
          <Route path="/admin/faculty" element={<Layout><ProtectedRoute allowedRoles={["ADMIN"]}><AdminFaculty /></ProtectedRoute></Layout>} />
          <Route path="/admin/hods" element={<Layout><ProtectedRoute allowedRoles={["ADMIN"]}><AdminHods /></ProtectedRoute></Layout>} />
          <Route path="/student/profile" element={<Layout><ProtectedRoute allowedRoles={["STUDENT"]}><StudentProfile /></ProtectedRoute></Layout>} />
          <Route path="/student/attendance" element={<Layout><ProtectedRoute allowedRoles={["STUDENT"]}><StudentAttendance /></ProtectedRoute></Layout>} />
          <Route path="/student/marks" element={<Layout><ProtectedRoute allowedRoles={["STUDENT"]}><StudentMarks /></ProtectedRoute></Layout>} />
          <Route path="/admin" element={<Layout><ProtectedRoute allowedRoles={["ADMIN"]}><AdminDashboard /></ProtectedRoute></Layout>} />
          <Route path="/hod" element={<Layout><ProtectedRoute allowedRoles={["HOD"]}><HodDashboard /></ProtectedRoute></Layout>} />
          <Route path="/faculty" element={<Layout><ProtectedRoute allowedRoles={["FACULTY"]}><FacultyDashboard /></ProtectedRoute></Layout>} />
          <Route path="/student" element={<Layout><ProtectedRoute allowedRoles={["STUDENT"]}><StudentDashboard /></ProtectedRoute></Layout>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

function RoleHome() {
  const { user } = useAuth()
  const { initializing } = useAuth()
  if (initializing) return null
  if (!user) return <Navigate to="/login" replace />
  switch (user.role) {
    case 'ADMIN':
      return <Navigate to="/admin" replace />
    case 'HOD':
      return <Navigate to="/hod" replace />
    case 'FACULTY':
      return <Navigate to="/faculty" replace />
    case 'STUDENT':
      return <Navigate to="/student" replace />
    default:
      return <Dashboard />
  }
}
