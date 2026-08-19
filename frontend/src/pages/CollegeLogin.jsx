import { useState } from 'react'
import { authApi } from '../services/api'

export default function CollegeLogin({ onLoginSuccess, onGoToRegister, onBack }) {
  const [formData, setFormData] = useState({ email: 'college@stanford.edu', password: 'college123' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await authApi.collegeLogin(formData)
      onLoginSuccess(res.user)
    } catch (err) {
      setError(err.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card-wrapper">
      <div className="panel auth-panel">
        <div className="auth-panel-header">
          <div className="auth-icon">🏛️</div>
          <h2>College Sign In</h2>
          <p className="subtext">Access your institution dashboard to manage faculty credentials</p>
        </div>

        {error && <div className="toast error">{error}</div>}

        <form onSubmit={handleSubmit} className="stack-form">
          <div>
            <label className="form-label">College Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="college@domain.edu"
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

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In as College'}
          </button>
          {onGoToRegister && (
            <button type="button" className="secondary-button" onClick={onGoToRegister}>
              New College? Register Institution
            </button>
          )}
          {onBack && (
            <button type="button" className="text-button" onClick={onBack}>
              &larr; Back to Role Selection
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
