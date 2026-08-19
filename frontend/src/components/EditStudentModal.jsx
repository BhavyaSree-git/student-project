import { useEffect, useState } from 'react'
import { teacherApi } from '../services/api'
import Modal from './Modal'

export default function EditStudentModal({ student, isOpen, onClose, onStudentUpdated }) {
  const [formData, setFormData] = useState({
    student_id: '',
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: 'Male',
    department: '',
    course: '',
    year: '',
    section: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (student && isOpen) {
      setFormData({
        student_id: student.student_id || '',
        name: student.name || '',
        email: student.email || '',
        phone: student.phone || '',
        date_of_birth: student.date_of_birth || '',
        gender: student.gender || 'Male',
        department: student.department || '',
        course: student.course || '',
        year: student.year || '',
        section: student.section || '',
      })
      setError('')
    }
  }, [student, isOpen])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      await teacherApi.updateStudent(student.id, formData)
      onStudentUpdated()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to update student.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Edit Student: ${student?.name || ''}`}
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="600px"
    >
      {error && <div className="toast error">{error}</div>}

      <form onSubmit={handleSubmit} className="stack-form">
        <div className="two-column">
          <div>
            <label className="form-label">Student ID</label>
            <input
              name="student_id"
              value={formData.student_id}
              onChange={handleChange}
              placeholder="e.g. CS101"
              required
            />
          </div>
          <div>
            <label className="form-label">Full Name</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Rahul Sharma"
              required
            />
          </div>
        </div>

        <div className="two-column">
          <div>
            <label className="form-label">Email</label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="student@example.com"
              required
            />
          </div>
          <div>
            <label className="form-label">Phone</label>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 555 0101"
              required
            />
          </div>
        </div>

        <div className="two-column">
          <div>
            <label className="form-label">Date of Birth</label>
            <input
              name="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="form-label">Gender</label>
            <select name="gender" value={formData.gender} onChange={handleChange}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="two-column">
          <div>
            <label className="form-label">Department</label>
            <input
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="Computer Science"
              required
            />
          </div>
          <div>
            <label className="form-label">Course</label>
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
            <label className="form-label">Academic Year</label>
            <input
              name="year"
              value={formData.year}
              onChange={handleChange}
              placeholder="3rd Year"
              required
            />
          </div>
          <div>
            <label className="form-label">Section</label>
            <input
              name="section"
              value={formData.section}
              onChange={handleChange}
              placeholder="A"
              required
            />
          </div>
        </div>

        <div className="button-row" style={{ marginTop: '16px' }}>
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Update Student'}
          </button>
          <button className="secondary-button" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}
