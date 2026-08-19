import { useState } from 'react'
import { authApi } from '../services/api'

export function RoleSelector({ onSelectRole, onBackToLanding }) {
  return (
    <div className="portal-selector-wrapper">
      <div className="portal-selector-header">
        <h1 className="portal-title">Welcome Back</h1>
        <p className="portal-subtitle">Select your role to access the EduManage portal</p>
      </div>

      <div className="portal-cards-grid">
        {/* Admin Card */}
        <div className="portal-role-card">
          <div className="portal-role-icon-box">
            <span className="portal-icon">🛡️</span>
          </div>
          <h3 className="portal-role-name">Admin</h3>
          <p className="portal-role-desc">
            Access system configurations, user management, and global institution settings.
          </p>
          <button className="portal-role-btn" onClick={() => onSelectRole('admin-login')}>
            Login
          </button>
        </div>

        {/* College Card */}
        <div className="portal-role-card">
          <div className="portal-role-icon-box">
            <span className="portal-icon">🏛️</span>
          </div>
          <h3 className="portal-role-name">College</h3>
          <p className="portal-role-desc">
            Manage departments, view aggregated reports, and oversee academic programs.
          </p>
          <button className="portal-role-btn" onClick={() => onSelectRole('college-login')}>
            Login
          </button>
        </div>

        {/* Teacher Card */}
        <div className="portal-role-card">
          <div className="portal-role-icon-box">
            <span className="portal-icon">🎓</span>
          </div>
          <h3 className="portal-role-name">Teacher</h3>
          <p className="portal-role-desc">
            Access your classes, manage grades, take attendance, and view schedules.
          </p>
          <button className="portal-role-btn" onClick={() => onSelectRole('teacher-login')}>
            Login
          </button>
        </div>
      </div>

      <div className="portal-footer-links">
        <a href="#help" className="portal-help-link">Need help accessing your account?</a>
        {onBackToLanding && (
          <div>
            <button className="portal-back-btn" onClick={onBackToLanding}>
              &larr; Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function AdminLoginForm({ onLoginSuccess, onBack }) {
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
          <div className="portal-role-icon-box">
            <span className="portal-icon">🛡️</span>
          </div>
          <h2>System Administrator</h2>
          <p className="subtext">Sign in to review college applications and system governance</p>
        </div>

        {error && <div className="toast toast-error">{error}</div>}

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

          <button className="portal-role-btn" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Signing in...' : 'Login as Admin'}
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

export function CollegeLoginForm({ onLoginSuccess, onGoToRegister, onBack }) {
  const [formData, setFormData] = useState({ email: 'college@stanford.edu', password: 'college123' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await authApi.collegeLogin(formData)
      onLoginSuccess(res.user)
    } catch (err) {
      const payload = err?.data || {}
      const title = payload.error || err.message || 'Invalid college email or password.'
      const message = payload.message || 'Invalid college email or password.'
      const reason = payload.reason || ''

      setError({
        title,
        message,
        reason,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card-wrapper">
      <div className="panel auth-panel">
        <div className="auth-panel-header">
          <div className="portal-role-icon-box">
            <span className="portal-icon">🏛️</span>
          </div>
          <h2>College Sign In</h2>
          <p className="subtext">Access your institution dashboard to manage faculty credentials</p>
        </div>

        {error && (
          <div className="toast toast-error">
            <strong>{error.title}</strong>
            <div>{error.message}</div>
            {error.reason && <div>{error.reason}</div>}
          </div>
        )}

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

          <button className="portal-role-btn" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Signing in...' : 'Login as College'}
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

export function CollegeRegisterForm({ onRegisterSuccess, onGoToLogin, onBack }) {
  const [formData, setFormData] = useState({
    college_name: '',
    university_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'USA',
    pincode: '',
    website: '',
    college_type: 'Private',
    password: '',
    confirm_password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await authApi.collegeRegister(formData)
      onRegisterSuccess('Registration submitted! Please wait for Admin approval before logging in.')
    } catch (err) {
      setError(err.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card-wrapper wide">
      <div className="panel auth-panel">
        <div className="auth-panel-header">
          <div className="portal-role-icon-box">
            <span className="portal-icon">🏛️</span>
          </div>
          <h2>College Registration</h2>
          <p className="subtext">Register your educational institution. Requires Admin review & approval.</p>
        </div>

        {error && <div className="toast toast-error">{error}</div>}

        <form onSubmit={handleSubmit} className="stack-form">
          <div className="two-column">
            <div>
              <label className="form-label">College Name *</label>
              <input
                name="college_name"
                value={formData.college_name}
                onChange={handleChange}
                placeholder="e.g. Stanford Institute of Technology"
                required
              />
            </div>
            <div>
              <label className="form-label">Affiliated University *</label>
              <input
                name="university_name"
                value={formData.university_name}
                onChange={handleChange}
                placeholder="e.g. Stanford University"
                required
              />
            </div>
          </div>

          <div className="two-column">
            <div>
              <label className="form-label">Official College Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="admissions@college.edu"
                required
              />
            </div>
            <div>
              <label className="form-label">Contact Phone *</label>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 650 723 2300"
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label">Campus Address *</label>
            <input
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="450 Jane Stanford Way"
              required
            />
          </div>

          <div className="two-column">
            <div>
              <label className="form-label">City *</label>
              <input name="city" value={formData.city} onChange={handleChange} placeholder="Stanford" required />
            </div>
            <div>
              <label className="form-label">State / Province *</label>
              <input name="state" value={formData.state} onChange={handleChange} placeholder="California" required />
            </div>
          </div>

          <div className="two-column">
            <div>
              <label className="form-label">Country *</label>
              <input name="country" value={formData.country} onChange={handleChange} placeholder="USA" required />
            </div>
            <div>
              <label className="form-label">Postal / ZIP Code *</label>
              <input name="pincode" value={formData.pincode} onChange={handleChange} placeholder="94305" required />
            </div>
          </div>

          <div className="two-column">
            <div>
              <label className="form-label">Official Website</label>
              <input name="website" value={formData.website} onChange={handleChange} placeholder="https://college.edu" />
            </div>
            <div>
              <label className="form-label">Institution Type *</label>
              <select name="college_type" value={formData.college_type} onChange={handleChange}>
                <option value="Government">Government / Public</option>
                <option value="Private">Private</option>
                <option value="Autonomous">Autonomous</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="two-column">
            <div>
              <label className="form-label">Account Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                required
              />
            </div>
            <div>
              <label className="form-label">Confirm Password *</label>
              <input
                type="password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                placeholder="Repeat password"
                required
              />
            </div>
          </div>

          <div className="button-row" style={{ marginTop: '10px' }}>
            <button className="portal-role-btn" type="submit" disabled={loading}>
              {loading ? 'Submitting Registration...' : 'Register College'}
            </button>
            <button type="button" className="secondary-button" onClick={onGoToLogin}>
              Already registered? Login
            </button>
          </div>
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

export function TeacherLoginForm({ onLoginSuccess, onBack }) {
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
          <div className="portal-role-icon-box">
            <span className="portal-icon">🎓</span>
          </div>
          <h2>Teacher Sign In</h2>
          <p className="subtext">Use credentials provided by your College Administrator</p>
        </div>

        {error && <div className="toast toast-error">{error}</div>}

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

          <button className="portal-role-btn" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Signing in...' : 'Login as Teacher'}
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
