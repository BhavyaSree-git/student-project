import { useEffect, useState } from 'react'
import './App.css'

const initialForm = {
  name: '',
  roll_number: '',
  email: '',
  department: '',
  year: '',
}

const initialSubjectForm = {
  subject_name: '',
  marks_obtained: '',
  max_marks: '',
}

const initialAttendanceForm = {
  total_classes: '',
  attended_classes: '',
}

const yearOrder = ['1st Year', '2nd Year', '3rd Year', '4th Year']

const departmentSubjectOptions = {
  CSE: {
    '1st Year': ['Programming Fundamentals', 'Engineering Mathematics', 'Physics', 'English'],
    '2nd Year': ['Data Structures', 'Digital Logic', 'Computer Organization', 'Object Oriented Programming'],
    '3rd Year': ['Algorithms', 'Database Management', 'Operating Systems', 'Computer Networks'],
    '4th Year': ['Machine Learning', 'Web Development', 'Software Engineering', 'Cyber Security'],
  },
  ECE: {
    '1st Year': ['Basic Electronics', 'Engineering Mathematics', 'Physics', 'Chemistry'],
    '2nd Year': ['Circuit Theory', 'Signals and Systems', 'Analog Electronics', 'Probability and Statistics'],
    '3rd Year': ['Microprocessors', 'Digital Communication', 'Control Systems', 'Electromagnetics'],
    '4th Year': ['VLSI Design', 'Wireless Networks', 'Embedded Systems', 'Optical Communication'],
  },
  EEE: {
    '1st Year': ['Basic Electrical Engineering', 'Engineering Mathematics', 'Physics', 'Chemistry'],
    '2nd Year': ['Circuit Analysis', 'Electromagnetics', 'Power Systems', 'Signals and Systems'],
    '3rd Year': ['Control Engineering', 'Electrical Machines', 'Power Electronics', 'Instrumentation'],
    '4th Year': ['Renewable Energy', 'Smart Grid', 'High Voltage Engineering', 'Electric Drives'],
  },
  Mechanical: {
    '1st Year': ['Engineering Mechanics', 'Engineering Graphics', 'Material Science', 'Mathematics II'],
    '2nd Year': ['Thermodynamics', 'Strength of Materials', 'Fluid Mechanics', 'Manufacturing Processes'],
    '3rd Year': ['Machine Design', 'Heat Transfer', 'Dynamics of Machines', 'Industrial Engineering'],
    '4th Year': ['Robotics', 'Automobile Engineering', 'Energy Systems', 'Production Planning'],
  },
  Civil: {
    '1st Year': ['Engineering Drawing', 'Mathematics II', 'Physics', 'Basic Mechanics'],
    '2nd Year': ['Surveying', 'Strength of Materials', 'Structural Analysis', 'Fluid Mechanics'],
    '3rd Year': ['Geotechnical Engineering', 'Transportation Engineering', 'Environmental Engineering', 'Concrete Technology'],
    '4th Year': ['Bridge Engineering', 'Construction Management', 'Hydraulics', 'Urban Planning'],
  },
  IT: {
    '1st Year': ['Computer Fundamentals', 'Engineering Mathematics', 'Physics', 'Communication Skills'],
    '2nd Year': ['Database Systems', 'Web Technologies', 'Data Structures', 'Discrete Mathematics'],
    '3rd Year': ['Software Testing', 'Information Security', 'Human Computer Interaction', 'Cloud Computing'],
    '4th Year': ['Big Data Analytics', 'DevOps', 'Cyber Security', 'Internet of Things'],
  },
}

const defaultYearSubjects = {
  '1st Year': ['Mathematics', 'Physics', 'Chemistry', 'English'],
  '2nd Year': ['Data Structures', 'Engineering Mechanics', 'Circuit Theory', 'Environmental Science'],
  '3rd Year': ['Algorithms', 'Materials Science', 'Computer Networks', 'Control Systems'],
  '4th Year': ['Project Management', 'Machine Learning', 'Power Systems', 'Professional Ethics'],
}

const getAvailableSubjects = (department, year) => {
  if (department && departmentSubjectOptions[department]?.[year]) {
    return departmentSubjectOptions[department][year]
  }
  return defaultYearSubjects[year] || []
}

function App() {
  const [students, setStudents] = useState([])
  const [form, setForm] = useState(initialForm)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [subjectForm, setSubjectForm] = useState(initialSubjectForm)
  const [editingSubjectId, setEditingSubjectId] = useState(null)
  const [attendanceForm, setAttendanceForm] = useState(initialAttendanceForm)
  const [isEditingAttendance, setIsEditingAttendance] = useState(true)
  const [status, setStatus] = useState({ message: '', error: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [aiSummary, setAiSummary] = useState('')
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)

  const apiUrl = 'http://192.168.68.100:5000/api/students';
  const rollNumberValue = form.roll_number === '' ? null : Number(form.roll_number)
  const hasValidRollNumber = Number.isSafeInteger(rollNumberValue) && rollNumberValue >= 0

  const selectedDepartment = selectedStudent?.department || ''
  const selectedYear = selectedStudent?.year || ''
  const availableSubjects = getAvailableSubjects(selectedDepartment, selectedYear)

  const marksObtainedValue = subjectForm.marks_obtained === '' ? null : Number(subjectForm.marks_obtained)
  const maxMarksValue = subjectForm.max_marks === '' ? null : Number(subjectForm.max_marks)
  const subjectValidationMessages = []

  if (!subjectForm.subject_name) {
    subjectValidationMessages.push('Choose a subject before adding marks.')
  }
  if (subjectForm.marks_obtained !== '' && (isNaN(marksObtainedValue) || marksObtainedValue < 0)) {
    subjectValidationMessages.push('Marks obtained must be zero or more.')
  }
  if (subjectForm.max_marks !== '' && (isNaN(maxMarksValue) || maxMarksValue <= 0)) {
    subjectValidationMessages.push('Maximum marks must be greater than zero.')
  }
  if (
    marksObtainedValue !== null &&
    maxMarksValue !== null &&
    marksObtainedValue > maxMarksValue
  ) {
    subjectValidationMessages.push('Marks obtained cannot exceed maximum marks.')
  }

  const selectedStudentSubjects = selectedStudent?.subjects ?? []
  const totalMarksObtained = selectedStudentSubjects.reduce(
    (sum, subject) => sum + Number(subject.marks_obtained || 0),
    0
  )
  const totalMaxMarks = selectedStudentSubjects.reduce(
    (sum, subject) => sum + Number(subject.max_marks || 0),
    0
  )
  const overallPercentage = totalMaxMarks > 0 ? Math.round((totalMarksObtained / totalMaxMarks) * 100) : 0

  const totalClassesValue = attendanceForm.total_classes === '' ? null : Number(attendanceForm.total_classes)
  const attendedClassesValue = attendanceForm.attended_classes === '' ? null : Number(attendanceForm.attended_classes)
  const attendanceValidationMessages = []

  if (attendanceForm.total_classes === '' || isNaN(totalClassesValue) || totalClassesValue <= 0) {
    attendanceValidationMessages.push('Total classes must be greater than 0.')
  }
  if (attendanceForm.attended_classes === '' || isNaN(attendedClassesValue) || attendedClassesValue < 0) {
    attendanceValidationMessages.push('Classes attended cannot be negative.')
  }
  if (
    totalClassesValue !== null &&
    attendedClassesValue !== null &&
    attendedClassesValue > totalClassesValue
  ) {
    attendanceValidationMessages.push('Classes attended cannot exceed total classes.')
  }

  const attendanceRate =
    selectedStudent?.attendance?.total_classes > 0
      ? Math.round(
        (Number(selectedStudent.attendance.attended_classes || 0) /
          Number(selectedStudent.attendance.total_classes || 1)) *
        100
      )
      : null
  const attendanceStatus = attendanceRate !== null
    ? attendanceRate >= 75
      ? 'good'
      : attendanceRate >= 60
        ? 'warning'
        : 'critical'
    : null
  const performanceLabel = totalMaxMarks
    ? overallPercentage >= 90
      ? 'Excellent performance'
      : overallPercentage >= 75
        ? 'Strong standing'
        : overallPercentage >= 60
          ? 'Satisfactory progress'
          : 'Needs attention'
    : 'No scores yet'
  const hasSavedAttendance = selectedStudent?.attendance?.total_classes > 0
  const showAttendanceForm = !hasSavedAttendance || isEditingAttendance

  const loadStudents = () => {
    fetch(apiUrl)
      .then((response) => response.json())
      .then((data) => {
        setStudents(data)
        setStatus({ message: '', error: '' })
      })
      .catch((error) => {
        console.error(error)
        setStatus({
          message: '',
          error: 'Unable to load students. Is the Flask backend running?',
        })
      })
  }

  const loadStudentDetail = (studentId) => {
    fetch(`${apiUrl}/${studentId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Student not found')
        }
        return response.json()
      })
      .then((data) => {
        setSelectedStudent(data)
        setAttendanceForm({
          total_classes: data.attendance?.total_classes ?? '',
          attended_classes: data.attendance?.attended_classes ?? '',
        })
        setIsEditingAttendance(!data.attendance || Number(data.attendance.total_classes) <= 0)
        setStatus({ message: `Loaded details for ${data.name}.`, error: '' })
      })
      .catch((error) => {
        console.error(error)
        setStatus({ message: '', error: 'Unable to load student details.' })
      })
  }

  useEffect(() => {
    loadStudents()
  }, [])

  useEffect(() => {
    if (status.message) {
      const timer = window.setTimeout(() => {
        setStatus((current) => ({ ...current, message: '' }))
      }, 4000)
      return () => window.clearTimeout(timer)
    }
    if (status.error) {
      const timer = window.setTimeout(() => {
        setStatus((current) => ({ ...current, error: '' }))
      }, 6000)
      return () => window.clearTimeout(timer)
    }
  }, [status])

  const resetForm = () => {
    setForm(initialForm)
    setSelectedId(null)
  }

  const resetSubjectForm = () => {
    setSubjectForm(initialSubjectForm)
    setEditingSubjectId(null)
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubjectChange = (event) => {
    const { name, value } = event.target
    setSubjectForm((current) => ({ ...current, [name]: value }))
  }

  const handleAttendanceChange = (event) => {
    const { name, value } = event.target
    setAttendanceForm((current) => ({ ...current, [name]: value }))
  }

  useEffect(() => {
    if (!selectedStudent) {
      return
    }

    const subjects = getAvailableSubjects(selectedStudent.department, selectedStudent.year)
    if (subjectForm.subject_name && !subjects.includes(subjectForm.subject_name)) {
      resetSubjectForm()
    }
  }, [selectedStudent])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!hasValidRollNumber) {
      setStatus({ message: '', error: 'Roll number must be a whole number.' })
      return
    }

    setIsSubmitting(true)
    const method = selectedId ? 'PUT' : 'POST'
    const url = selectedId ? `${apiUrl}/${selectedId}` : apiUrl

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((body) => {
            throw new Error(body.error || 'Server error')
          })
        }
        return response.json()
      })
      .then(() => {
        resetForm()
        loadStudents()
        if (selectedStudent?.id === selectedId) {
          loadStudentDetail(selectedId)
        }
        setStatus({
          message: selectedId ? 'Student updated successfully.' : 'Student added successfully.',
          error: '',
        })
      })
      .catch((error) => {
        console.error(error)
        setStatus({ message: '', error: error.message })
      })
      .finally(() => {
        setIsSubmitting(false)
      })
  }

  const handleEdit = (student) => {
    setSelectedId(student.id)
    setForm({
      name: student.name,
      roll_number: student.roll_number,
      email: student.email,
      department: student.department,
      year: student.year,
    })
    setStatus({ message: 'Editing student. Make changes and save.', error: '' })
  }

  const handleDelete = (studentId) => {
    if (!window.confirm('Delete this student?')) {
      return
    }

    fetch(`${apiUrl}/${studentId}`, { method: 'DELETE' })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((body) => {
            throw new Error(body.error || 'Server error')
          })
        }
        return response.json()
      })
      .then(() => {
        if (selectedStudent?.id === studentId) {
          setSelectedStudent(null)
          resetSubjectForm()
          setAttendanceForm(initialAttendanceForm)
        }
        loadStudents()
        setStatus({ message: 'Student deleted successfully.', error: '' })
      })
      .catch((error) => {
        console.error(error)
        setStatus({ message: '', error: error.message })
      })
  }

  const handleSelectStudent = (student) => {
    setSelectedStudent(null)
    setAiSummary('')
    resetSubjectForm()
    setSelectedId(null)
    resetForm()
    loadStudentDetail(student.id)
  }

  const handleGenerateSummary = () => {
    if (!selectedStudent) {
      return
    }

    setIsGeneratingSummary(true)
    setAiSummary('')
    fetch(`${apiUrl.replace('/students', '')}/ai/student-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: selectedStudent.id }),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((body) => {
            throw new Error(body.error || 'Unable to generate the AI summary.')
          })
        }
        return response.json()
      })
      .then((data) => {
        setAiSummary(data.summary)
        setStatus({ message: 'AI performance summary generated.', error: '' })
      })
      .catch((error) => {
        console.error(error)
        setStatus({ message: '', error: error.message })
      })
      .finally(() => {
        setIsGeneratingSummary(false)
      })
  }

  const handleSubjectSubmit = (event) => {
    event.preventDefault()
    if (!selectedStudent) {
      setStatus({ message: '', error: 'Select a student before adding subjects.' })
      return
    }

    if (subjectValidationMessages.length > 0) {
      setStatus({ message: '', error: subjectValidationMessages[0] })
      return
    }

    const method = editingSubjectId ? 'PUT' : 'POST'
    const url = editingSubjectId
      ? `${apiUrl}/${selectedStudent.id}/subjects/${editingSubjectId}`
      : `${apiUrl}/${selectedStudent.id}/subjects`

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject_name: subjectForm.subject_name,
        marks_obtained: Number(subjectForm.marks_obtained),
        max_marks: Number(subjectForm.max_marks),
      }),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((body) => {
            throw new Error(body.error || 'Server error')
          })
        }
        return response.json()
      })
      .then(() => {
        loadStudentDetail(selectedStudent.id)
        resetSubjectForm()
        setStatus({
          message: editingSubjectId ? 'Subject updated successfully.' : 'Subject added successfully.',
          error: '',
        })
      })
      .catch((error) => {
        console.error(error)
        setStatus({ message: '', error: error.message })
      })
  }

  const handleEditSubject = (subject) => {
    setEditingSubjectId(subject.id)
    setSubjectForm({
      subject_name: subject.subject_name,
      marks_obtained: String(subject.marks_obtained),
      max_marks: String(subject.max_marks),
    })
    setStatus({ message: 'Editing subject. Make changes and save.', error: '' })
  }

  const handleDeleteSubject = (subjectId) => {
    if (!selectedStudent) return
    if (!window.confirm('Delete this subject?')) return

    fetch(`${apiUrl}/${selectedStudent.id}/subjects/${subjectId}`, { method: 'DELETE' })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((body) => {
            throw new Error(body.error || 'Server error')
          })
        }
        return response.json()
      })
      .then(() => {
        loadStudentDetail(selectedStudent.id)
        resetSubjectForm()
        setStatus({ message: 'Subject deleted successfully.', error: '' })
      })
      .catch((error) => {
        console.error(error)
        setStatus({ message: '', error: error.message })
      })
  }

  const handleAttendanceSubmit = (event) => {
    event.preventDefault()
    if (!selectedStudent) {
      setStatus({ message: '', error: 'Select a student before updating attendance.' })
      return
    }

    fetch(`${apiUrl}/${selectedStudent.id}/attendance`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        total_classes: attendanceForm.total_classes,
        attended_classes: attendanceForm.attended_classes,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((body) => {
            throw new Error(body.error || 'Server error')
          })
        }
        return response.json()
      })
      .then(() => {
        loadStudentDetail(selectedStudent.id)
        setIsEditingAttendance(false)
        setStatus({ message: 'Attendance saved successfully.', error: '' })
      })
      .catch((error) => {
        console.error(error)
        setStatus({ message: '', error: error.message })
      })
  }

  return (
    <main className="app-container">
      <div className="page-shell">
        <header className="app-header">
          <div className="header-copy">
            <p className="eyebrow">Student Tracker</p>
            <h1>Student Management Tracker</h1>
            <p className="subtitle">Manage students and academic information in one clean workspace.</p>
          </div>
        </header>

        {(status.message || status.error) && (
          <div className={`toast ${status.error ? 'toast-error' : 'toast-success'}`}>
            {status.error || status.message}
          </div>
        )}

        <section className="form-section">
          <div className="student-form-card">
            <div className="card-header">
              <div>
                <h2>{selectedId ? 'Edit Student' : 'Add Student'}</h2>
                <p className="card-description">Use this form to add or update student information.</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="student-form">
              <div className="form-grid">
                <label>
                  Name
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </label>
                <label>
                  Roll Number
                  <input
                    type="number"
                    name="roll_number"
                    value={form.roll_number}
                    onChange={handleChange}
                    min="0"
                    step="1"
                    inputMode="numeric"
                    required
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </label>
                <label>
                  Department
                  <select name="department" value={form.department} onChange={handleChange} required>
                    <option value="">Select Department</option>
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Civil">Civil</option>
                    <option value="IT">IT</option>
                  </select>
                </label>
                <label>
                  Year
                  <select name="year" value={form.year} onChange={handleChange} required>
                    <option value="">Select Year</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </label>
              </div>
              <div className="form-actions form-actions-bottom">
                <button type="submit" className="primary-button" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : selectedId ? 'Update Student' : 'Add Student'}
                </button>
                {selectedId && (
                  <button type="button" className="secondary" onClick={resetForm}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="student-list-card">
            <div className="card-header">
              <div>
                <h2>Student Details</h2>
                <p className="card-description">Below is the student table with current records.</p>
              </div>
            </div>
            {students.length === 0 ? (
              <div className="empty-state-card">
                <p className="empty-title">No students yet</p>
                <p>Add a student with the form above to start tracking records.</p>
              </div>
            ) : (
              <div className="student-table">
                <div className="table-header">
                  <span>Name</span>
                  <span>Roll Number</span>
                  <span>Email</span>
                  <span>Department</span>
                  <span>Year</span>
                  <span aria-hidden="true"></span>
                </div>
                {students.map((student) => (
                  <div key={student.id} className="table-row">
                    <span>{student.name}</span>
                    <span>{student.roll_number}</span>
                    <span>{student.email}</span>
                    <span>{student.department}</span>
                    <span>{student.year}</span>
                    <span className="row-actions">
                      <button type="button" className="row-button" onClick={() => handleSelectStudent(student)}>
                        View
                      </button>
                      <button type="button" className="row-button" onClick={() => handleEdit(student)}>
                        Edit
                      </button>
                      <button type="button" className="row-button secondary" onClick={() => handleDelete(student.id)}>
                        Delete
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {selectedStudent && (
          <section className="details-grid">
            <div className="student-detail-card">
              <div className="card-header student-detail-header">
                <div>
                  <h2>Student Details</h2>
                  <p className="card-description">Selected student academic information and performance summary.</p>
                </div>
                <button
                  type="button"
                  className="row-button ai-summary-button"
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary}
                >
                  {isGeneratingSummary ? 'Generating...' : 'AI Summary'}
                </button>
              </div>
              <div className="detail-list">
                <div>
                  <p className="detail-label">Name</p>
                  <p>{selectedStudent.name}</p>
                </div>
                <div>
                  <p className="detail-label">Roll Number</p>
                  <p>{selectedStudent.roll_number}</p>
                </div>
                <div>
                  <p className="detail-label">Email</p>
                  <p>{selectedStudent.email}</p>
                </div>
                <div>
                  <p className="detail-label">Department</p>
                  <p>{selectedStudent.department}</p>
                </div>
                <div>
                  <p className="detail-label">Year</p>
                  <p>{selectedStudent.year}</p>
                </div>
              </div>
              {(isGeneratingSummary || aiSummary) && (
                <section className="ai-summary-card" aria-live="polite">
                  <h3>AI Student Performance Summary</h3>
                  <p>{isGeneratingSummary ? 'Generating your summary...' : aiSummary}</p>
                </section>
              )}
            </div>

            <div className="subject-attendance-wrapper">
              <div className="subject-card">
                <div className="performance-summary-card">
                  <div>
                    <p>Total Score</p>
                    <strong>
                      {totalMarksObtained} / {totalMaxMarks || '--'}
                    </strong>
                  </div>
                  <div>
                    <p>Overall %</p>
                    <strong>{totalMaxMarks ? `${overallPercentage}%` : '--'}</strong>
                  </div>
                  <div>
                    <p>Attendance</p>
                    <strong>{attendanceRate !== null ? `${attendanceRate}%` : 'N/A'}</strong>
                  </div>
                  <div className="performance-label">
                    {performanceLabel}
                  </div>
                </div>
                <h3>Subjects</h3>
                <form onSubmit={handleSubjectSubmit} className="subject-form">
                  <div className="form-grid">
                    <label>
                      Subject Name
                      <select
                        name="subject_name"
                        value={subjectForm.subject_name}
                        onChange={handleSubjectChange}
                        required
                        disabled={!availableSubjects.length}
                      >
                        <option value="">Pick subject</option>
                        {availableSubjects.map((subject) => (
                          <option key={subject} value={subject}>
                            {subject}
                          </option>
                        ))}
                      </select>
                      {!selectedStudent && (
                        <p className="helper-text">Select a student first to load valid subjects.</p>
                      )}
                    </label>
                    <label>
                      Marks Obtained
                      <input
                        type="number"
                        name="marks_obtained"
                        value={subjectForm.marks_obtained}
                        onChange={handleSubjectChange}
                        min="0"
                        required
                      />
                    </label>
                    <label>
                      Maximum Marks
                      <input
                        type="number"
                        name="max_marks"
                        value={subjectForm.max_marks}
                        onChange={handleSubjectChange}
                        min="1"
                        required
                      />
                    </label>
                  </div>
                  {subjectValidationMessages.length > 0 && (
                    <div className="validation-note">
                      {subjectValidationMessages.map((message) => (
                        <p key={message}>{message}</p>
                      ))}
                    </div>
                  )}
                  <div className="form-actions form-actions-bottom">
                    <button type="submit" className="primary-button">
                      {editingSubjectId ? 'Update Subject' : 'Add Subject'}
                    </button>
                    {editingSubjectId && (
                      <button type="button" className="secondary" onClick={resetSubjectForm}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>

                {selectedStudentSubjects.length === 0 ? (
                  <p className="empty-note">No subjects added yet.</p>
                ) : (
                  <div className="subject-list">
                    {selectedStudentSubjects.map((subject) => (
                      <article key={subject.id} className="subject-item">
                        <div>
                          <p className="subject-name">{subject.subject_name}</p>
                          <p className="subject-meta">
                            Marks: {subject.marks_obtained} / {subject.max_marks}
                          </p>
                        </div>
                        <div className="subject-actions">
                          <button type="button" className="row-button" onClick={() => handleEditSubject(subject)}>
                            Edit
                          </button>
                          <button type="button" className="row-button secondary" onClick={() => handleDeleteSubject(subject.id)}>
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="attendance-card">
                <div className="attendance-card-header">
                  <h3>Attendance</h3>
                  {hasSavedAttendance && !isEditingAttendance && (
                    <button
                      type="button"
                      className="row-button"
                      onClick={() => setIsEditingAttendance(true)}
                    >
                      Edit Attendance
                    </button>
                  )}
                </div>
                {showAttendanceForm ? (
                  <form onSubmit={handleAttendanceSubmit} className="attendance-form">
                    <div className="form-grid">
                      <label>
                        Total Classes
                        <input
                          type="number"
                          name="total_classes"
                          min="1"
                          value={attendanceForm.total_classes}
                          onChange={handleAttendanceChange}
                          required
                        />
                      </label>
                      <label>
                        Classes Attended
                        <input
                          type="number"
                          name="attended_classes"
                          min="0"
                          value={attendanceForm.attended_classes}
                          onChange={handleAttendanceChange}
                          required
                        />
                      </label>
                    </div>
                    {attendanceValidationMessages.length > 0 && (
                      <div className="validation-note">
                        {attendanceValidationMessages.map((message) => (
                          <p key={message}>{message}</p>
                        ))}
                      </div>
                    )}
                    <div className="form-actions form-actions-bottom">
                      <button type="submit" className="primary-button">
                        Save Attendance
                      </button>
                      {hasSavedAttendance && (
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => {
                            setAttendanceForm({
                              total_classes: selectedStudent.attendance?.total_classes ?? '',
                              attended_classes: selectedStudent.attendance?.attended_classes ?? '',
                            })
                            setIsEditingAttendance(false)
                            setStatus({ message: 'Attendance edit canceled.', error: '' })
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  <div className="attendance-summary-card">
                    <div className="attendance-summary-row">
                      <span>Total Classes</span>
                      <strong>{selectedStudent.attendance?.total_classes ?? '—'}</strong>
                    </div>
                    <div className="attendance-summary-row">
                      <span>Classes Attended</span>
                      <strong>{selectedStudent.attendance?.attended_classes ?? '—'}</strong>
                    </div>
                    <div className="attendance-summary-row">
                      <span>Attendance %</span>
                      <strong>{attendanceRate !== null ? `${attendanceRate}%` : 'N/A'}</strong>
                    </div>
                    <div className={`attendance-status-pill attendance-${attendanceStatus}`}>
                      {attendanceStatus === 'good'
                        ? 'On track'
                        : attendanceStatus === 'warning'
                          ? 'Needs focus'
                          : 'At risk'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

export default App
