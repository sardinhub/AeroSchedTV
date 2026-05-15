import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import '../styles/admin.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError('Email atau password salah. Silakan coba lagi.')
    } else {
      navigate('/admin')
    }
  }

  return (
    <div className="login-root">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo-icon">✈️</span>
          <div className="login-logo-title">AeroSched TV</div>
          <div className="login-logo-sub">Triesakti Institute of Airlines</div>
        </div>

        <div className="login-form-title">Admin Panel — Login</div>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span> {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleLogin}>
          <div className="form-field">
            <label className="form-label">Email Admin</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="admin@triesakti.ac.id"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label">Password</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary login-submit"
            disabled={loading}
          >
            {loading ? '⏳ Masuk...' : '🔐 Masuk ke Dashboard'}
          </button>
        </form>

        <div className="login-footer">
          Sistem informasi jadwal mengajar dosen<br />
          © 2025 Triesakti Institute of Airlines
        </div>
      </div>
    </div>
  )
}
