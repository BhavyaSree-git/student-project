import { useMemo, useState } from 'react'
import './App.css'

const API_BASE = 'http://localhost:5000/api'

const initialCollegeForm = {
  college_name: '',
  university_name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  country: '',
  pincode: '',
  website: '',
  college_type: 'Government',
  password: '',
  confirm_password: '',
}

const initialAdminLogin = { username: 'admin', password: 'admin123' }
const initialCollegeLogin = { email: '', password: '' }
const initialTeacherLogin = { email: '', password: '' }

function App() {
  const [screen, setScreen] = useState('home')
  const [status, setStatus] = useState({ message: '', error: '' })
  const [adminLogin, setAdminLogin] = useState(initialAdminLogin)
  const [collegeLogin, setCollegeLogin] = useState(initialCollegeLogin)
  const [teacherLogin, setTeacherLogin] = useState(initialTeacherLogin)
  const [collegeForm, setCollegeForm] = useState(initialCollegeForm)
  const [collegeData, setCollegeData] = useState(null)
  const [teacherData, setTeacherData] = useState(null)
  const [adminData, setAdminData] = useState(null)
  const [colleges, setColleges] = useState([])
  const [teachers, setTeachers] = useState([])
  const [students, setStudents] = useState([])
  const [teacherDashboard, setTeacherDashboard] = useState(null)
  const [aiTopStudents, setAiTopStudents] = useState([])
  const [aiSummary, setAiSummary] = useState('')
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)

  const totalCollegeStats = useMemo(() => {
    const counts = {
      pending: colleges.filter((college) => college.approval_status === 'PENDING').length,
      approved: colleges.filter((college) => college.approval_status === 'APPROVED').length,
      rejected: colleges.filter((college) => college.approval_status === 'REJECTED').length,
      active: colleges.filter((college) => college.is_active).length,
      inactive: colleges.filter((college) => !college.is_active).length,
    }
    return counts
  }, [colleges])

  const fetchJson = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    })

    const contentType = response.headers.get('content-type') || ''
    const body = contentType.includes('application/json') ? await response.json() : await response.text()

    if (!response.ok) {
      const message = typeof body === 'string' ? body : body.error || 'Request failed.'
      throw new Error(message)
    }
    return body
  }

  const loadAdminDashboard = async () => {
    try {
      const dashboard = await fetchJson(`${API_BASE}/admin/dashboard`, { method: 'GET' })
      const collegeResponse = await fetchJson(`${API_BASE}/admin/colleges`, { method: 'GET' })
      setColleges(collegeResponse)
      setAdminData(dashboard)
      setScreen('admin-dashboard')
      setStatus({ message: 'Admin dashboard loaded.', error: '' })
    } catch (error) {
      setStatus({ message: '', error: error.message })
    }
  }

  const loadCollegeDashboard = async () => {
    try {
      const profile = await fetchJson(`${API_BASE}/college/profile`, { method: 'GET' })
      const teacherResponse = await fetchJson(`${API_BASE}/college/teachers`, { method: 'GET' })
      setCollegeData(profile)
      setTeachers(teacherResponse)
      setScreen('college-dashboard')
      setStatus({ message: 'College dashboard loaded.', error: '' })
    } catch (error) {
      setStatus({ message: '', error: error.message })
    }
  }

  const loadTeacherDashboard = async () => {
    try {
      const profile = await fetchJson(`${API_BASE}/teacher/profile`, { method: 'GET' })
      const teacherDashboardData = await fetchJson(`${API_BASE}/teacher/dashboard`, { method: 'GET' })
      const studentResponse = await fetchJson(`${API_BASE}/teacher/students`, { method: 'GET' })
      setTeacherData(profile)
      setTeacherDashboard(teacherDashboardData)
      setStudents(studentResponse)
      setScreen('teacher-dashboard')
      setStatus({ message: 'Teacher dashboard loaded.', error: '' })
    } catch (error) {
      setStatus({ message: '', error: error.message })
    }
  }

  const handleAdminLoginSubmit = async (event) => {
    event.preventDefault()
    try {
      const response = await fetchJson(`${API_BASE}/auth/admin/login`, {
        method: 'POST',
        body: JSON.stringify(adminLogin),
      })
      setAdminData(response.user)
      await loadAdminDashboard()
    } catch (error) {
      setStatus({ message: '', error: error.message })
    }
  }

  const handleCollegeRegisterSubmit = async (event) => {
    event.preventDefault()
    try {
      await fetchJson(`${API_BASE}/auth/college/register`, {
        method: 'POST',
        body: JSON.stringify(collegeForm),
      })
      setStatus({ message: 'College registered successfully. Awaiting admin approval.', error: '' })
      setCollegeForm(initialCollegeForm)
      setScreen('college-login')
    } catch (error) {
      setStatus({ message: '', error: error.message })
    }
  }

  const handleCollegeLoginSubmit = async (event) => {
    event.preventDefault()
    try {
      await fetchJson(`${API_BASE}/auth/college/login`, {
        method: 'POST',
        body: JSON.stringify(collegeLogin),
      })
      await loadCollegeDashboard()
    } catch (error) {
      setStatus({ message: '', error: error.message })
    }
  }

  const handleTeacherLoginSubmit = async (event) => {
    event.preventDefault()
    try {
      const response = await fetchJson(`${API_BASE}/auth/teacher/login`, {
        method: 'POST',
        body: JSON.stringify(teacherLogin),
      })
      setTeacherData(response.teacher)
      await loadTeacherDashboard()
    } catch (error) {
      setStatus({ message: '', error: error.message })
    }
  }

  const handleCreateTeacher = async (event) => {
    event.preventDefault()
    const form = event.target
    const payload = {
      name: form.name.value,
      email: form.email.value,
      password: form.password.value,
      confirm_password: form.confirm_password.value,
      department: form.department.value,
      subject: form.subject.value,
    }

    try {
      const response = await fetchJson(`${API_BASE}/college/teachers`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setTeachers((current) => [response.teacher, ...current])
      setStatus({ message: 'Teacher created successfully.', error: '' })
      form.reset()
      setScreen('college-dashboard')
    } catch (error) {
      setStatus({ message: '', error: error.message })
    }
  }

  const handleAdminAction = async (type, id, reason) => {
    try {
      const payload = reason ? { reason } : {}
      await fetchJson(`${API_BASE}/admin/colleges/${id}/${type}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      await loadAdminDashboard()
      setStatus({ message: `College ${type} action completed.`, error: '' })
    } catch (error) {
      setStatus({ message: '', error: error.message })
    }
  }

  const handleAddStudent = async (event) => {
    event.preventDefault()
    const form = event.target
    const payload = {
      student_id: form.student_id.value,
      name: form.name.value,
      email: form.email.value,
      phone: form.phone.value,
      date_of_birth: form.date_of_birth.value,
      gender: form.gender.value,
      department: form.department.value,
      course: form.course.value,
      year: form.year.value,
      section: form.section.value,
    }

    try {
      const response = await fetchJson(`${API_BASE}/students`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setStudents((current) => [response.student, ...current])
      setStatus({ message: 'Student added successfully.', error: '' })
      form.reset()
      setScreen('teacher-dashboard')
    } catch (error) {
      setStatus({ message: '', error: error.message })
    }
  }

  const handleAiSummary = async () => {
    setIsGeneratingSummary(true)
    setAiSummary('')
    setAiTopStudents([])

    try {
      const response = await fetchJson(`${API_BASE}/ai/summary`, { method: 'GET' })
      setAiTopStudents(response.top_students || [])
      setAiSummary(response.summary || '')
      setStatus({ message: 'AI summary generated successfully.', error: '' })
    } catch (error) {
      setStatus({ message: '', error: error.message })
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  const logout = async () => {
    try {
      await fetchJson(`${API_BASE}/auth/logout`, { method: 'POST' })
    } catch (error) {
      console.error(error)
    }
    setScreen('home')
    setCollegeData(null)
    setTeacherData(null)
    setAdminData(null)
    setCollegeLogin(initialCollegeLogin)
    setTeacherLogin(initialTeacherLogin)
    setAdminLogin(initialAdminLogin)
    setStatus({ message: 'Logged out', error: '' })
  }

  const renderHome = () => (
    <div className="role-grid">
      <button className="role-card" onClick={() => setScreen('admin-login')}>
        <strong>Admin</strong>
        <span>Manage colleges and system approvals</span>
      </button>
      <button className="role-card" onClick={() => setScreen('college-register')}>
        <strong>College</strong>
        <span>Register and manage your institution</span>
      </button>
      <button className="role-card" onClick={() => setScreen('teacher-login')}>
        <strong>Teacher</strong>
        <span>Manage students, marks and attendance</span>
      </button>
    </div>
  )

  const renderAdminLogin = () => (
    <div className="panel">
      <h2>Admin Login</h2>
      <form onSubmit={handleAdminLoginSubmit} className="stack-form">
        <input value={adminLogin.username} onChange={(e) => setAdminLogin({ ...adminLogin, username: e.target.value })} placeholder="Username" />
        <input type="password" value={adminLogin.password} onChange={(e) => setAdminLogin({ ...adminLogin, password: e.target.value })} placeholder="Password" />
        <button className="primary-button" type="submit">Login</button>
        <button type="button" className="secondary-button" onClick={() => setScreen('home')}>Back</button>
      </form>
    </div>
  )

  const renderCollegeRegister = () => (
    <div className="panel">
      <h2>College Registration</h2>
      <form onSubmit={handleCollegeRegisterSubmit} className="stack-form">
        <div className="two-column">
          <input value={collegeForm.college_name} onChange={(e) => setCollegeForm({ ...collegeForm, college_name: e.target.value })} placeholder="College Name" />
          <input value={collegeForm.university_name} onChange={(e) => setCollegeForm({ ...collegeForm, university_name: e.target.value })} placeholder="University Name" />
        </div>
        <div className="two-column">
          <input value={collegeForm.email} onChange={(e) => setCollegeForm({ ...collegeForm, email: e.target.value })} placeholder="College Email" />
          <input value={collegeForm.phone} onChange={(e) => setCollegeForm({ ...collegeForm, phone: e.target.value })} placeholder="Phone Number" />
        </div>
        <input value={collegeForm.address} onChange={(e) => setCollegeForm({ ...collegeForm, address: e.target.value })} placeholder="Address" />
        <div className="two-column">
          <input value={collegeForm.city} onChange={(e) => setCollegeForm({ ...collegeForm, city: e.target.value })} placeholder="City" />
          <input value={collegeForm.state} onChange={(e) => setCollegeForm({ ...collegeForm, state: e.target.value })} placeholder="State" />
        </div>
        <div className="two-column">
          <input value={collegeForm.country} onChange={(e) => setCollegeForm({ ...collegeForm, country: e.target.value })} placeholder="Country" />
          <input value={collegeForm.pincode} onChange={(e) => setCollegeForm({ ...collegeForm, pincode: e.target.value })} placeholder="Pincode" />
        </div>
        <div className="two-column">
          <input value={collegeForm.website} onChange={(e) => setCollegeForm({ ...collegeForm, website: e.target.value })} placeholder="Website (optional)" />
          <select value={collegeForm.college_type} onChange={(e) => setCollegeForm({ ...collegeForm, college_type: e.target.value })}>
            <option>Government</option>
            <option>Private</option>
            <option>Autonomous</option>
            <option>Other</option>
          </select>
        </div>
        <div className="two-column">
          <input type="password" value={collegeForm.password} onChange={(e) => setCollegeForm({ ...collegeForm, password: e.target.value })} placeholder="Password" />
          <input type="password" value={collegeForm.confirm_password} onChange={(e) => setCollegeForm({ ...collegeForm, confirm_password: e.target.value })} placeholder="Confirm Password" />
        </div>
        <button className="primary-button" type="submit">Register College</button>
        <button type="button" className="secondary-button" onClick={() => setScreen('college-login')}>Already registered? Login</button>
      </form>
    </div>
  )

  const renderCollegeLogin = () => (
    <div className="panel">
      <h2>College Login</h2>
      <form onSubmit={handleCollegeLoginSubmit} className="stack-form">
        <input value={collegeLogin.email} onChange={(e) => setCollegeLogin({ ...collegeLogin, email: e.target.value })} placeholder="College Email" />
        <input type="password" value={collegeLogin.password} onChange={(e) => setCollegeLogin({ ...collegeLogin, password: e.target.value })} placeholder="Password" />
        <button className="primary-button" type="submit">Login</button>
        <button type="button" className="secondary-button" onClick={() => setScreen('college-register')}>Register</button>
      </form>
    </div>
  )

  const renderTeacherLogin = () => (
    <div className="panel">
      <h2>Teacher Login</h2>
      <form onSubmit={handleTeacherLoginSubmit} className="stack-form">
        <input value={teacherLogin.email} onChange={(e) => setTeacherLogin({ ...teacherLogin, email: e.target.value })} placeholder="Teacher Email" />
        <input type="password" value={teacherLogin.password} onChange={(e) => setTeacherLogin({ ...teacherLogin, password: e.target.value })} placeholder="Password" />
        <button className="primary-button" type="submit">Login</button>
        <button type="button" className="secondary-button" onClick={() => setScreen('home')}>Back</button>
      </form>
    </div>
  )

  const renderAdminDashboard = () => (
    <div className="panel">
      <div className="topbar">
        <div>
          <h2>Admin Dashboard</h2>
          <p>Welcome, {adminData?.username || 'Admin'}</p>
        </div>
        <button className="secondary-button" onClick={logout}>Logout</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><span>Total Colleges</span><strong>{adminData ? colleges.length : 0}</strong></div>
        <div className="stat-card"><span>Pending</span><strong>{totalCollegeStats.pending}</strong></div>
        <div className="stat-card"><span>Approved</span><strong>{totalCollegeStats.approved}</strong></div>
        <div className="stat-card"><span>Rejected</span><strong>{totalCollegeStats.rejected}</strong></div>
        <div className="stat-card"><span>Active</span><strong>{totalCollegeStats.active}</strong></div>
        <div className="stat-card"><span>Inactive</span><strong>{totalCollegeStats.inactive}</strong></div>
        <div className="stat-card"><span>Teachers</span><strong>{teachers.length || 0}</strong></div>
        <div className="stat-card"><span>Students</span><strong>{students.length || 0}</strong></div>
      </div>

      <div className="list-panel">
        <h3>College Registrations</h3>
        {colleges.length === 0 ? <p>No colleges found.</p> : (
          <div className="table-list">
            {colleges.map((college) => (
              <div key={college.id} className="table-row">
                <div>
                  <strong>{college.college_name}</strong>
                  <small>{college.email}</small>
                </div>
                <div><span className="tag">{college.approval_status}</span></div>
                <div><span className="tag">{college.is_active ? 'Active' : 'Inactive'}</span></div>
                <div className="actions">
                  {college.approval_status !== 'APPROVED' && (
                    <button onClick={() => handleAdminAction('approve', college.id)}>Approve</button>
                  )}
                  {college.approval_status !== 'REJECTED' && (
                    <button onClick={() => {
                      const reason = window.prompt('Rejection reason:') || 'No reason provided.'
                      handleAdminAction('reject', college.id, reason)
                    }}>Reject</button>
                  )}
                  {college.approval_status === 'APPROVED' && college.is_active && (
                    <button onClick={() => {
                      const reason = window.prompt('Deactivation reason:') || 'No reason provided.'
                      handleAdminAction('deactivate', college.id, reason)
                    }}>Deactivate</button>
                  )}
                  {college.approval_status === 'APPROVED' && !college.is_active && (
                    <button onClick={() => handleAdminAction('activate', college.id)}>Activate</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderCollegeDashboard = () => (
    <div className="panel">
      <div className="topbar">
        <div>
          <h2>College Dashboard</h2>
          <p>{collegeData?.college_name} • {collegeData?.university_name}</p>
        </div>
        <button className="secondary-button" onClick={logout}>Logout</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><span>College Name</span><strong>{collegeData?.college_name}</strong></div>
        <div className="stat-card"><span>University</span><strong>{collegeData?.university_name}</strong></div>
        <div className="stat-card"><span>Location</span><strong>{collegeData?.city}, {collegeData?.state}</strong></div>
        <div className="stat-card"><span>Total Teachers</span><strong>{collegeData?.total_teachers || 0}</strong></div>
        <div className="stat-card"><span>Total Students</span><strong>{collegeData?.total_students || 0}</strong></div>
      </div>

      <div className="button-row">
        <button className="primary-button" onClick={() => setScreen('college-create-teacher')}>Create Teacher</button>
        <button className="secondary-button" onClick={() => setScreen('college-teachers')}>View Teachers</button>
        <button className="secondary-button" onClick={() => setScreen('college-profile')}>College Profile</button>
      </div>

      {screen === 'college-profile' && (
        <div className="list-panel">
          <h3>College Profile</h3>
          <ul className="key-value-list">
            <li><span>Email</span><strong>{collegeData?.email}</strong></li>
            <li><span>Phone</span><strong>{collegeData?.phone}</strong></li>
            <li><span>Address</span><strong>{collegeData?.address}</strong></li>
            <li><span>Type</span><strong>{collegeData?.college_type}</strong></li>
            <li><span>Status</span><strong>{collegeData?.approval_status}</strong></li>
          </ul>
        </div>
      )}

      {screen === 'college-teachers' && (
        <div className="list-panel">
          <h3>Teachers</h3>
          {teachers.length === 0 ? <p>No teachers created yet.</p> : (
            <div className="table-list">
              {teachers.map((teacher) => (
                <div key={teacher.id} className="table-row">
                  <div><strong>{teacher.name}</strong><small>{teacher.email}</small></div>
                  <div>{teacher.department}</div>
                  <div>{teacher.subject}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )

  const renderCreateTeacher = () => (
    <div className="panel">
      <h2>Create Teacher</h2>
      <form onSubmit={handleCreateTeacher} className="stack-form">
        <input name="name" placeholder="Teacher Name" />
        <input name="email" placeholder="Teacher Email" />
        <input type="password" name="password" placeholder="Password" />
        <input type="password" name="confirm_password" placeholder="Confirm Password" />
        <input name="department" placeholder="Department" />
        <input name="subject" placeholder="Subject" />
        <div className="button-row">
          <button className="primary-button" type="submit">Create Teacher</button>
          <button className="secondary-button" type="button" onClick={() => setScreen('college-dashboard')}>Cancel</button>
        </div>
      </form>
    </div>
  )

  const renderTeacherDashboard = () => (
    <div className="panel">
      <div className="topbar">
        <div>
          <h2>Teacher Dashboard</h2>
          <p>{teacherData?.name} • {teacherData?.college_name}</p>
        </div>
        <button className="secondary-button" onClick={logout}>Logout</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><span>Teacher</span><strong>{teacherData?.name}</strong></div>
        <div className="stat-card"><span>College</span><strong>{teacherDashboard?.college_name}</strong></div>
        <div className="stat-card"><span>Department</span><strong>{teacherDashboard?.department}</strong></div>
        <div className="stat-card"><span>Subject</span><strong>{teacherDashboard?.subject}</strong></div>
        <div className="stat-card"><span>Total Students</span><strong>{teacherDashboard?.total_students || 0}</strong></div>
        <div className="stat-card"><span>Avg Marks</span><strong>{teacherDashboard?.average_marks || 0}%</strong></div>
        <div className="stat-card"><span>Avg Attendance</span><strong>{teacherDashboard?.average_attendance || 0}%</strong></div>
      </div>

      <div className="button-row">
        <button className="primary-button" onClick={() => setScreen('teacher-add-student')}>Add Student</button>
        <button className="secondary-button" onClick={() => setScreen('teacher-students')}>View Students</button>
        <button className="secondary-button" onClick={handleAiSummary} disabled={isGeneratingSummary}>{isGeneratingSummary ? 'Generating...' : 'AI Summary'}</button>
      </div>

      {aiTopStudents.length > 0 && (
        <div className="list-panel">
          <h3>Top 3 Students</h3>
          <div className="table-list">
            {aiTopStudents.map((student, index) => (
              <div key={student.student_id} className="table-row">
                <div><strong>#{index + 1} {student.name}</strong></div>
                <div>Marks: {student.marks}%</div>
                <div>Attendance: {student.attendance}%</div>
                <div>Overall: {student.overall_score}%</div>
              </div>
            ))}
          </div>
          {aiSummary && (
            <div className="summary-box">
              <h4>AI Summary</h4>
              <p>{aiSummary}</p>
            </div>
          )}
        </div>
      )}

      {screen === 'teacher-students' && (
        <div className="list-panel">
          <h3>Students</h3>
          {students.length === 0 ? <p>No students found.</p> : (
            <div className="table-list">
              {students.map((student) => (
                <div key={student.id} className="table-row">
                  <div><strong>{student.name}</strong><small>{student.student_id}</small></div>
                  <div>{student.course}</div>
                  <div>{student.year}</div>
                  <div>{student.department}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )

  const renderAddStudent = () => (
    <div className="panel">
      <h2>Add Student</h2>
      <form onSubmit={handleAddStudent} className="stack-form">
        <input name="student_id" placeholder="Student ID" />
        <input name="name" placeholder="Student Name" />
        <input name="email" placeholder="Email" />
        <input name="phone" placeholder="Phone" />
        <input name="date_of_birth" type="date" />
        <select name="gender">
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
        <input name="department" placeholder="Department" />
        <input name="course" placeholder="Course" />
        <input name="year" placeholder="Year" />
        <input name="section" placeholder="Section" />
        <div className="button-row">
          <button className="primary-button" type="submit">Save Student</button>
          <button className="secondary-button" type="button" onClick={() => setScreen('teacher-dashboard')}>Cancel</button>
        </div>
      </form>
    </div>
  )

  return (
    <main className="app-shell">
      <div className="container">
        <header className="page-header">
          <div>
            <p className="eyebrow">Multi-role Academic Portal</p>
            <h1>Student Management System</h1>
          </div>
          {(screen !== 'home' && screen !== 'admin-login' && screen !== 'college-register' && screen !== 'college-login' && screen !== 'teacher-login') && (
            <button className="secondary-button" onClick={logout}>Logout</button>
          )}
        </header>

        {status.message && <div className="toast success">{status.message}</div>}
        {status.error && <div className="toast error">{status.error}</div>}

        {screen === 'home' && renderHome()}
        {screen === 'admin-login' && renderAdminLogin()}
        {screen === 'college-register' && renderCollegeRegister()}
        {screen === 'college-login' && renderCollegeLogin()}
        {screen === 'teacher-login' && renderTeacherLogin()}
        {screen === 'admin-dashboard' && renderAdminDashboard()}
        {screen === 'college-dashboard' && renderCollegeDashboard()}
        {screen === 'college-create-teacher' && renderCreateTeacher()}
        {screen === 'teacher-dashboard' && renderTeacherDashboard()}
        {screen === 'teacher-add-student' && renderAddStudent()}
      </div>
    </main>
  )
}

export default App
