import { useState } from 'react'
import { authApi } from '../services/api'

export default function CollegeRegister({ onRegisterSuccess, onGoToLogin, onBack }) {
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
          <div className="auth-icon">🏛️</div>
          <h2>College Registration</h2>
          <p className="subtext">Register your educational institution. Account requires Admin approval.</p>
        </div>

        {error && <div className="toast error">{error}</div>}

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
            <button className="primary-button" type="submit" disabled={loading}>
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
