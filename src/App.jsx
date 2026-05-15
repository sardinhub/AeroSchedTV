import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import DisplayPage from './display/DisplayPage'
import AdminPage from './admin/AdminPage'
import LoginPage from './admin/LoginPage'
import { AuthProvider, useAuth } from './admin/AuthContext'

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="auth-loading">Memuat...</div>
  if (!session) return <Navigate to="/admin/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DisplayPage />} />
          <Route path="/admin/login" element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
