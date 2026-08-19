import { useState } from 'react'
import { authApi } from '../services/api'

export default function ResetTeacherPassword({ onComplete, onLogout }) {
  const [formData, setFormData] = useState({ new_password: '', confirm_password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await authApi.resetTeacherPassword(formData)
      onComplete(response.user, response.message)
    } catch (err) {
      setError(err.message || 'Unable to reset your password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="portal-page-shell reset-password-shell">
      <div className="panel auth-panel reset-password-card">
        <div className="auth-panel-header">
          <div className="auth-icon">🔐</div>
          <h2>Create your new password</h2>
          <p className="subtext">You signed in with a temporary password. Choose a new password to continue to your teacher dashboard.</p>
        </div>

        {error && <div className="toast error">{error}</div>}

        <form onSubmit={handleSubmit} className="stack-form">
          <div>
            <label className="form-label">New password</label>
            <input type="password" value={formData.new_password} onChange={(event) => setFormData({ ...formData, new_password: event.target.value })} placeholder="At least 6 characters" minLength="6" required autoFocus />
          </div>
          <div>
            <label className="form-label">Confirm new password</label>
            <input type="password" value={formData.confirm_password} onChange={(event) => setFormData({ ...formData, confirm_password: event.target.value })} placeholder="Repeat your new password" minLength="6" required />
          </div>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Saving new password...' : 'Save password and continue'}
          </button>
          <button className="secondary-button" type="button" onClick={onLogout}>Sign out</button>
        </form>
      </div>
    </div>
  )
}
