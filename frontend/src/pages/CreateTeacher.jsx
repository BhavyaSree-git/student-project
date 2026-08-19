import { useEffect, useMemo, useState } from 'react'
import { collegeApi } from '../services/api'

export default function CreateTeacher({ onTeacherCreated, onCancel, departments: externalDepartments = [], subjects: externalSubjects = [] }) {
  const [departments, setDepartments] = useState(externalDepartments)
  const [subjects, setSubjects] = useState(externalSubjects)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    employee_id: '',
    designation: '',
    password: '',
    confirm_password: '',
    department: '',
    subject: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fetchingMeta, setFetchingMeta] = useState(false)

  useEffect(() => {
    setDepartments(externalDepartments)
    setSubjects(externalSubjects)
  }, [externalDepartments, externalSubjects])

  useEffect(() => {
    if (externalDepartments.length || externalSubjects.length) return

    const loadMeta = async () => {
      try {
        setFetchingMeta(true)
        const [departmentList, subjectList] = await Promise.all([
          collegeApi.getDepartments(),
          collegeApi.getSubjects(),
        ])
        setDepartments(departmentList)
        setSubjects(subjectList)
      } catch (err) {
        console.error(err)
      } finally {
        setFetchingMeta(false)
      }
    }

    loadMeta()
  }, [externalDepartments.length, externalSubjects.length])

  const filteredSubjects = useMemo(() => {
    if (!formData.department) return subjects
    const selectedDepartment = departments.find((d) => d.name === formData.department)
    return selectedDepartment
      ? subjects.filter((subject) => subject.department_id === selectedDepartment.id)
      : subjects
  }, [departments, formData.department, subjects])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const next = { ...prev, [name]: value }
      if (name === 'department') {
        next.subject = ''
      }
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await collegeApi.createTeacher(formData)
      if (onTeacherCreated) onTeacherCreated(res.message, res.teacher)
    } catch (err) {
      setError(err.message || 'Failed to create teacher credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="panel auth-panel wide">
      <div className="panel-header-row">
        <div>
          <h3>Create Teacher Credentials</h3>
          <p className="subtext">
            Create a temporary password and email the credentials to the teacher. They will be required to set a new password after their first sign-in.
          </p>
        </div>
      </div>

      {error && <div className="toast error">{error}</div>}

      {(fetchingMeta || (!departments.length && !subjects.length)) && (
        <div className="subtext" style={{ marginBottom: '16px' }}>
          Loading department and subject catalog for your college...
        </div>
      )}

      {!fetchingMeta && departments.length === 0 && (
        <div className="toast error" style={{ marginBottom: '16px' }}>
          No departments have been created yet. Add a department before issuing faculty credentials.
        </div>
      )}

      <form onSubmit={handleSubmit} className="stack-form">
        <div className="two-column">
          <div>
            <label className="form-label">Teacher Full Name *</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Prof. Alan Turing"
              required
            />
          </div>
          <div>
            <label className="form-label">Official Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="teacher@college.edu"
              required
            />
          </div>
        </div>

        <div className="two-column">
          <div>
            <label className="form-label">Phone</label>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 555 123 4567"
            />
          </div>
          <div>
            <label className="form-label">Employee ID</label>
            <input
              name="employee_id"
              value={formData.employee_id}
              onChange={handleChange}
              placeholder="EMP-1001"
            />
          </div>
        </div>

        <div className="two-column">
          <div>
            <label className="form-label">Designation</label>
            <input
              name="designation"
              value={formData.designation}
              onChange={handleChange}
              placeholder="Professor / Assistant Professor"
            />
          </div>
          <div>
            <label className="form-label">Department *</label>
            <select name="department" value={formData.department} onChange={handleChange} required disabled={departments.length === 0}>
              <option value="">Select department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="two-column">
          <div>
            <label className="form-label">Subject Assigned *</label>
            <select name="subject" value={formData.subject} onChange={handleChange} required disabled={!formData.department || filteredSubjects.length === 0}>
              <option value="">Select subject</option>
              {filteredSubjects.map((subject) => (
                <option key={subject.id} value={subject.name}>{subject.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Temporary Password *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Teacher must change this after signing in"
              required
            />
          </div>
        </div>

        <div className="two-column">
          <div>
            <label className="form-label">Confirm Temporary Password *</label>
            <input
              type="password"
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleChange}
              placeholder="Repeat password"
              required
            />
          </div>
          <div />
        </div>

        <div className="button-row" style={{ marginTop: '16px' }}>
          <button className="primary-button" type="submit" disabled={loading || departments.length === 0}>
            {loading ? 'Creating Teacher...' : 'Create Teacher Credentials'}
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
