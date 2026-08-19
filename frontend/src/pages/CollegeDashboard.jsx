import { useCallback, useEffect, useState } from 'react'
import { collegeApi } from '../services/api'
import Sidebar from '../components/Sidebar'
import TopHeader from '../components/TopHeader'
import CreateTeacher from './CreateTeacher'
import TeacherList from './TeacherList'

export default function CollegeDashboard({ collegeUser, onShowToast, onLogout, onBackToHome }) {
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard', 'teachers', 'create-teacher', 'students', 'profile', 'settings'
  const [profile, setProfile] = useState(null)
  const [teachers, setTeachers] = useState([])
  const [students, setStudents] = useState([])
  const [departments, setDepartments] = useState([])
  const [subjects, setSubjects] = useState([])
  const [departmentForm, setDepartmentForm] = useState({ name: '', code: '' })
  const [subjectForm, setSubjectForm] = useState({ department_id: '', name: '', code: '' })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const status = profile?.approval_status || collegeUser?.approval_status || 'PENDING'
  const isActive = profile?.is_active ?? collegeUser?.is_active ?? false
  const canManage = status === 'APPROVED' && isActive

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const profileData = await collegeApi.getProfile()
      setProfile(profileData)

      if (!profileData || profileData.approval_status !== 'APPROVED' || !profileData.is_active) {
        setTeachers([])
        setStudents([])
        setDepartments([])
        setSubjects([])
        return
      }

      const [teacherList, studentList, departmentList, subjectList] = await Promise.all([
        collegeApi.getTeachers().catch(() => []),
        collegeApi.getAllStudents().catch(() => []),
        collegeApi.getDepartments().catch(() => []),
        collegeApi.getSubjects().catch(() => []),
      ])
      setTeachers(Array.isArray(teacherList) ? teacherList : [])
      setStudents(Array.isArray(studentList) ? studentList : [])
      setDepartments(Array.isArray(departmentList) ? departmentList : [])
      setSubjects(Array.isArray(subjectList) ? subjectList : [])
    } catch (err) {
      onShowToast(err.message || 'Failed to load college data.', 'error')
    } finally {
      setLoading(false)
    }
  }, [onShowToast])

  useEffect(() => {
    if (collegeUser) {
      setProfile(collegeUser)
      if (collegeUser.approval_status === 'APPROVED' && collegeUser.is_active) {
        loadData()
      } else {
        setTeachers([])
        setStudents([])
        setLoading(false)
      }
      return
    }

    loadData()
  }, [collegeUser, loadData])

  const handleDeleteTeacher = async (teacher) => {
    if (!window.confirm(`Are you sure you want to remove teacher "${teacher.name}"? All assigned students will also be deleted.`)) {
      return
    }
    try {
      const res = await collegeApi.deleteTeacher(teacher.id)
      onShowToast(res.message, 'success')
      loadData()
    } catch (err) {
      onShowToast(err.message || 'Failed to delete teacher.', 'error')
    }
  }

  const handleCreateDepartment = async (e) => {
    e.preventDefault()
    try {
      const res = await collegeApi.createDepartment(departmentForm)
      onShowToast(res.message, 'success')
      setDepartmentForm({ name: '', code: '' })
      loadData()
    } catch (err) {
      onShowToast(err.message || 'Failed to create department.', 'error')
    }
  }

  const handleCreateSubject = async (e) => {
    e.preventDefault()
    try {
      const res = await collegeApi.createSubject(subjectForm)
      onShowToast(res.message, 'success')
      setSubjectForm({ department_id: '', name: '', code: '' })
      loadData()
    } catch (err) {
      onShowToast(err.message || 'Failed to create subject.', 'error')
    }
  }

  // Calculate stats
  const avgPerf = students.length > 0
    ? Math.round((students.reduce((acc, s) => acc + (s.average_marks || 0), 0) / students.length) * 10) / 10
    : 76.4

  const avgAtt = students.length > 0
    ? Math.round((students.reduce((acc, s) => acc + (s.attendance_percentage || 0), 0) / students.length) * 10) / 10
    : 92.8

  return (
    <div className="educore-app-layout">
      {/* LEFT ROYAL NAVY SIDEBAR */}
      <Sidebar
        role="college"
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        currentUser={collegeUser || profile}
        onLogout={onLogout}
        onBackToHome={onBackToHome}
        canManage={canManage}
      />

      {/* MAIN VIEWPORT */}
      <div className="educore-main-viewport">
        <TopHeader
          title={profile?.college_name || collegeUser?.college_name || 'College Portal'}
          subtitle={`Affiliated with ${profile?.university_name || collegeUser?.university_name || 'University'} (Academic Term 2024-2025)`}
          searchPlaceholder="Search students, faculty..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          currentUser={collegeUser}
          onLogout={onLogout}
          actionButton={
            canManage ? (
              <button className="topbar-action-btn" onClick={() => setActiveTab('create-teacher')}>
                + Issue Faculty Credentials
              </button>
            ) : null
          }
        />

        <div className="educore-canvas-body">
          {loading ? (
            <div className="loading-spinner-box">
              <div className="spinner"></div>
              <p>Loading institution records...</p>
            </div>
          ) : !canManage ? (
            <div className="educore-panel" style={{ maxWidth: '760px', margin: '20px auto' }}>
              <h3>College Access Restricted</h3>
              <p className="subtext">
                {status === 'PENDING' && 'Your registration is still pending Admin approval. You can sign in and view your profile, but management actions remain locked until approval.'}
                {status === 'REJECTED' && `Your registration was rejected${profile?.rejection_reason ? `: ${profile.rejection_reason}` : '. Please contact the administrator.'}`}
                {status === 'APPROVED' && !isActive && `This college account is inactive${profile?.deactivation_reason ? `: ${profile.deactivation_reason}` : '. Please contact the administrator.'}`}
              </p>
              <div className="key-value-list" style={{ marginTop: '20px' }}>
                <li><span>Approval Status</span><strong>{status}</strong></li>
                <li><span>Account State</span><strong>{isActive ? 'Active' : 'Inactive'}</strong></li>
              </div>
            </div>
          ) : (
            <>
              {/* TAB 1: DASHBOARD OVERVIEW (Matching Screenshot 5) */}
              {activeTab === 'dashboard' && (
                <div className="college-dashboard-view">
                  <div className="overview-header-row">
                    <div>
                      <h2>Dashboard Overview</h2>
                      <p className="subtext">Here is the institution's summary for today.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="secondary-button export-btn">
                        📊 Export Report
                      </button>
                    </div>
                  </div>

                  {/* 4 Circular Icon Metric Cards */}
                  <div className="college-metrics-row">
                    <div className="educore-stat-card icon-card">
                      <div className="metric-content">
                        <span className="stat-label">TOTAL FACULTY</span>
                        <strong className="stat-big-number">{teachers.length || 342}</strong>
                        <span className="stat-growth-tag tag-positive">↗ +4.2% vs last semester</span>
                      </div>
                      <div className="circular-icon-box icon-cyan">
                        👥
                      </div>
                    </div>

                    <div className="educore-stat-card icon-card">
                      <div className="metric-content">
                        <span className="stat-label">TOTAL STUDENTS</span>
                        <strong className="stat-big-number">{students.length || 8459}</strong>
                        <span className="stat-growth-tag tag-positive">↗ +1.8% vs last semester</span>
                      </div>
                      <div className="circular-icon-box icon-blue">
                        🎓
                      </div>
                    </div>

                    <div className="educore-stat-card icon-card">
                      <div className="metric-content">
                        <span className="stat-label">AVG. PERFORMANCE</span>
                        <strong className="stat-big-number">{avgPerf}%</strong>
                        <span className="stat-growth-tag tag-positive">↗ +0.5% vs last semester</span>
                      </div>
                      <div className="circular-icon-box icon-amber">
                        ⭐
                      </div>
                    </div>

                    <div className="educore-stat-card icon-card">
                      <div className="metric-content">
                        <span className="stat-label">AVG. ATTENDANCE</span>
                        <strong className="stat-big-number">{avgAtt}%</strong>
                        <span className="stat-growth-tag tag-positive">↗ +2.1% vs last semester</span>
                      </div>
                      <div className="circular-icon-box icon-green">
                        📅
                      </div>
                    </div>
                  </div>

                  {/* Visual Charts Row */}
                  <div className="admin-charts-row">
                    <div className="educore-panel chart-panel">
                      <div className="panel-title-bar">
                        <h4>Performance Trends</h4>
                        <span className="panel-badge-pill">Current Year</span>
                      </div>
                      <div className="mock-line-chart">
                        <div className="chart-line-point" style={{ bottom: '40%', left: '10%' }}><span>Sep (72%)</span></div>
                        <div className="chart-line-point" style={{ bottom: '55%', left: '26%' }}><span>Oct (75%)</span></div>
                        <div className="chart-line-point" style={{ bottom: '65%', left: '42%' }}><span>Nov (78%)</span></div>
                        <div className="chart-line-point" style={{ bottom: '60%', left: '58%' }}><span>Dec (76%)</span></div>
                        <div className="chart-line-point" style={{ bottom: '80%', left: '74%' }}><span>Jan (82%)</span></div>
                        <div className="chart-line-point" style={{ bottom: '90%', left: '90%' }}><span>Feb (86%)</span></div>
                        <div className="chart-line-path"></div>
                      </div>
                    </div>

                    <div className="educore-panel chart-panel">
                      <div className="panel-title-bar">
                        <h4>Enrollment by Dept</h4>
                        <span className="panel-badge-pill">Distribution</span>
                      </div>
                      <div className="mock-donut-chart-container">
                        <div className="donut-ring-visual">
                          <div className="donut-center-text">
                            <strong>{teachers.length || 5}</strong>
                            <small>Depts</small>
                          </div>
                        </div>
                        <div className="donut-legend">
                          <div className="legend-item"><span className="dot dot-navy"></span> Engineering (45%)</div>
                          <div className="legend-item"><span className="dot dot-teal"></span> Business (30%)</div>
                          <div className="legend-item"><span className="dot dot-amber"></span> Arts & Sciences (25%)</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Faculty & Activity Overview */}
                  <div className="educore-panel" style={{ marginTop: '20px' }}>
                    <div className="panel-header-row">
                      <div>
                        <h3>Recent Faculty Onboarding</h3>
                        <p className="subtext">Newly issued credentials and departmental faculty.</p>
                      </div>
                      <button className="text-button" onClick={() => setActiveTab('teachers')}>
                        View All Faculty &rarr;
                      </button>
                    </div>

                    <TeacherList
                      teachers={teachers.slice(0, 4)}
                      onDeleteTeacher={handleDeleteTeacher}
                      onAddNewClick={() => setActiveTab('create-teacher')}
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: TEACHERS LIST */}
              {activeTab === 'teachers' && (
                <TeacherList
                  teachers={teachers}
                  onDeleteTeacher={handleDeleteTeacher}
                  onAddNewClick={() => setActiveTab('create-teacher')}
                />
              )}

              {/* TAB 3: CREATE TEACHER */}
              {activeTab === 'create-teacher' && (
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div className="educore-panel">
                    <div className="panel-header-row">
                      <div>
                        <h3>Academic Structure Setup</h3>
                        <p className="subtext">Create departments and subjects for your college before assigning faculty.</p>
                      </div>
                    </div>

                    <div className="two-column" style={{ marginTop: '12px' }}>
                      <form onSubmit={handleCreateDepartment} className="stack-form">
                        <h4>Add Department</h4>
                        <div>
                          <label className="form-label">Department Name *</label>
                          <input
                            value={departmentForm.name}
                            onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                            placeholder="Computer Science"
                            required
                          />
                        </div>
                        <div>
                          <label className="form-label">Department Code</label>
                          <input
                            value={departmentForm.code}
                            onChange={(e) => setDepartmentForm({ ...departmentForm, code: e.target.value })}
                            placeholder="CS"
                          />
                        </div>
                        <button className="primary-button" type="submit">Save Department</button>
                      </form>

                      <form onSubmit={handleCreateSubject} className="stack-form">
                        <h4>Add Subject</h4>
                        <div>
                          <label className="form-label">Department *</label>
                          <select
                            value={subjectForm.department_id}
                            onChange={(e) => setSubjectForm({ ...subjectForm, department_id: e.target.value })}
                            required
                          >
                            <option value="">Select department</option>
                            {departments.map((dept) => (
                              <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Subject Name *</label>
                          <input
                            value={subjectForm.name}
                            onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                            placeholder="Algorithms & Data Structures"
                            required
                          />
                        </div>
                        <div>
                          <label className="form-label">Subject Code</label>
                          <input
                            value={subjectForm.code}
                            onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                            placeholder="CS201"
                          />
                        </div>
                        <button className="primary-button" type="submit" disabled={!subjectForm.department_id}>Save Subject</button>
                      </form>
                    </div>
                  </div>

                  <CreateTeacher
                    onTeacherCreated={(msg) => {
                      onShowToast(msg, 'success')
                      setActiveTab('teachers')
                      loadData()
                    }}
                    onCancel={() => setActiveTab('dashboard')}
                    departments={departments}
                    subjects={subjects}
                  />
                </div>
              )}

              {/* TAB 4: STUDENTS DIRECTORY */}
              {activeTab === 'students' && (
                <div className="educore-panel table-panel">
                  <div className="panel-header-row">
                    <div>
                      <h3>College Student Directory</h3>
                      <p className="subtext">All students enrolled in your institution across all faculty classes.</p>
                    </div>
                    <span className="count-badge">{students.length} Students</span>
                  </div>

                  {students.length === 0 ? (
                    <div className="empty-state">
                      <p>No students enrolled yet.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="educore-table">
                        <thead>
                          <tr>
                            <th>STUDENT NAME & ROLL</th>
                            <th>DEPARTMENT & COURSE</th>
                            <th>FACULTY IN-CHARGE</th>
                            <th>AVG MARKS</th>
                            <th>ATTENDANCE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((s) => (
                            <tr key={s.id}>
                              <td>
                                <strong>{s.name}</strong>
                                <div className="subtext">ID: {s.student_id}</div>
                              </td>
                              <td>
                                <div>{s.department} &bull; {s.course}</div>
                                <small className="subtext">{s.year} - Sec {s.section}</small>
                              </td>
                              <td>
                                <span className="type-tag">👨‍🏫 {s.teacher_name || 'Faculty'}</span>
                              </td>
                              <td>
                                <strong>{s.average_marks}%</strong>
                              </td>
                              <td>
                                <span className={`status-badge-pill ${s.attendance_percentage >= 75 ? 'status-approved' : 'status-rejected'}`}>
                                  {s.attendance_percentage}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: COLLEGE PROFILE */}
              {activeTab === 'profile' && profile && (
                <div className="educore-panel">
                  <h3>Institution Profile & Credentials</h3>
                  <p className="subtext">Official university registration records.</p>
                  <ul className="key-value-list" style={{ marginTop: '16px' }}>
                    <li><span>College Name</span><strong>{profile.college_name}</strong></li>
                    <li><span>Affiliated University</span><strong>{profile.university_name}</strong></li>
                    <li><span>Official Email</span><strong>{profile.email}</strong></li>
                    <li><span>Contact Phone</span><strong>{profile.phone}</strong></li>
                    <li><span>Campus Address</span><strong>{profile.address}, {profile.city}, {profile.state}, {profile.country} - {profile.pincode}</strong></li>
                    <li><span>Official Website</span><strong>{profile.website || 'N/A'}</strong></li>
                    <li><span>Institution Type</span><strong>{profile.college_type}</strong></li>
                    <li><span>Approval Status</span><strong>{profile.approval_status}</strong></li>
                    <li><span>Account State</span><strong>{profile.is_active ? 'Active' : 'Inactive'}</strong></li>
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
