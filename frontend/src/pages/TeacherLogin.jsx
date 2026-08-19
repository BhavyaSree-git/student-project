import { useState } from 'react'
import { authApi } from '../services/api'

export default function TeacherLogin({ onLoginSuccess, onBack }) {
  const [formData, setFormData] = useState({ email: 'teacher@stanford.edu', password: 'teacher123' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await authApi.teacherLogin(formData)
      onLoginSuccess(res.user)
    } catch (err) {
      setError(err.message || 'Invalid teacher credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card-wrapper">
      <div className="panel auth-panel">
        <div className="auth-panel-header">
          <div className="auth-icon">👨‍🏫</div>
          <h2>Teacher Sign In</h2>
          <p className="subtext">Use the credentials created by your College administrator</p>
        </div>

        {error && <div className="toast error">{error}</div>}

        <form onSubmit={handleSubmit} className="stack-form">
          <div>
            <label className="form-label">Teacher Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="teacher@college.edu"
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

          <div className="notice-box">
            <small>💡 Teachers do not self-register. Credentials must be created by your College Admin.</small>
          </div>

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In as Teacher'}
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
