import { useState } from 'react'
import { authApi } from '../services/api'

export default function AdminLogin({ onLoginSuccess, onBack }) {
  const [formData, setFormData] = useState({ username: 'admin', password: 'admin123' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await authApi.adminLogin(formData)
      onLoginSuccess(res.user)
    } catch (err) {
      setError(err.message || 'Invalid admin credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card-wrapper">
      <div className="panel auth-panel">
        <div className="auth-panel-header">
          <div className="auth-icon">🛡️</div>
          <h2>System Administrator</h2>
          <p className="subtext">Sign in to review college applications and system reports</p>
        </div>

        {error && <div className="toast error">{error}</div>}

        <form onSubmit={handleSubmit} className="stack-form">
          <div>
            <label className="form-label">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="admin"
              required
            />
          </div>
          <div>
            <label className="form-label">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="demo-hint-box">
            <small>Default credentials: <strong>admin</strong> / <strong>admin123</strong></small>
          </div>

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In as Admin'}
          </button>
          {onBack && (
            <button type="button" className="secondary-button" onClick={onBack}>
              &larr; Back to Role Selection
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
