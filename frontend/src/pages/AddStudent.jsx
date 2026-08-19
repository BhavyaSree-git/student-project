import { useState } from 'react'
import { teacherApi } from '../services/api'

export default function AddStudent({ defaultDepartment = 'Computer Science', onStudentAdded, onCancel }) {
  const [formData, setFormData] = useState({
    student_id: '',
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: 'Male',
    department: defaultDepartment,
    course: 'B.Tech',
    year: '1st Year',
    section: 'A',
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
      const res = await teacherApi.createStudent(formData)
      if (onStudentAdded) onStudentAdded(res.message, res.student)
    } catch (err) {
      setError(err.message || 'Failed to add student.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="panel form-panel">
      <div className="panel-header-row">
        <div>
          <h3>Add New Student</h3>
          <p className="subtext">Register a new student directly into your class.</p>
        </div>
      </div>

      {error && <div className="toast error">{error}</div>}

      <form onSubmit={handleSubmit} className="stack-form">
        <div className="two-column">
          <div>
            <label className="form-label">Student ID / Roll No *</label>
            <input
              name="student_id"
              value={formData.student_id}
              onChange={handleChange}
              placeholder="e.g. CS106"
              required
            />
          </div>
          <div>
            <label className="form-label">Full Name *</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Rohit Verma"
              required
            />
          </div>
        </div>

        <div className="two-column">
          <div>
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="student@example.com"
              required
            />
          </div>
          <div>
            <label className="form-label">Phone Number *</label>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 555 0199"
              required
            />
          </div>
        </div>

        <div className="two-column">
          <div>
            <label className="form-label">Date of Birth *</label>
            <input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="form-label">Gender *</label>
            <select name="gender" value={formData.gender} onChange={handleChange}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="two-column">
          <div>
            <label className="form-label">Department *</label>
            <input
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="Computer Science"
              required
            />
          </div>
          <div>
            <label className="form-label">Course *</label>
            <input
              name="course"
              value={formData.course}
              onChange={handleChange}
              placeholder="B.Tech"
              required
            />
          </div>
        </div>

        <div className="two-column">
          <div>
            <label className="form-label">Academic Year *</label>
            <input
              name="year"
              value={formData.year}
              onChange={handleChange}
              placeholder="3rd Year"
              required
            />
          </div>
          <div>
            <label className="form-label">Section *</label>
            <input
              name="section"
              value={formData.section}
              onChange={handleChange}
              placeholder="A"
              required
            />
          </div>
        </div>

        <div className="button-row" style={{ marginTop: '14px' }}>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Saving Student...' : 'Save Student'}
          </button>
          {onCancel && (
            <button type="button" className="secondary-button" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
