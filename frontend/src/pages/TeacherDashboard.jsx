import { useCallback, useEffect, useState } from 'react'
import { teacherApi } from '../services/api'
import Sidebar from '../components/Sidebar'
import TopHeader from '../components/TopHeader'
import MarksModal from '../components/MarksModal'
import AttendanceModal from '../components/AttendanceModal'
import StudentDetailsModal from '../components/StudentDetailsModal'
import EditStudentModal from '../components/EditStudentModal'
import AddStudent from './AddStudent'
import StudentList from './StudentList'
import AISummary from './AISummary'

export default function TeacherDashboard({ teacherUser, onShowToast, onLogout, onBackToHome }) {
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard', 'students', 'add-student', 'ai-summary', 'settings'
  const [dashboardData, setDashboardData] = useState(null)
  const [students, setStudents] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  // AI Summary State
  const [aiSummary, setAiSummary] = useState('')
  const [topStudents, setTopStudents] = useState([])
  const [aiEngine, setAiEngine] = useState('')
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)

  // Modal States
  const [selectedStudentForMarks, setSelectedStudentForMarks] = useState(null)
  const [selectedStudentForAttendance, setSelectedStudentForAttendance] = useState(null)
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState(null)
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [dash, studentList] = await Promise.all([
        teacherApi.getDashboard(),
        teacherApi.getStudents(searchQuery),
      ])
      setDashboardData(dash)
      setStudents(studentList)
    } catch (err) {
      onShowToast(err.message || 'Failed to load teacher dashboard.', 'error')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, onShowToast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDeleteStudent = async (student) => {
    if (!window.confirm(`Are you sure you want to delete student "${student.name}" (${student.student_id})?`)) {
      return
    }
    try {
      const res = await teacherApi.deleteStudent(student.id)
      onShowToast(res.message, 'success')
      loadData()
    } catch (err) {
      onShowToast(err.message || 'Failed to delete student.', 'error')
    }
  }

  const handleTriggerAiSummary = async () => {
    setIsGeneratingAi(true)
    try {
      const data = await teacherApi.getAiSummary()
      setTopStudents(data.top_students || [])
      setAiSummary(data.summary || '')
      setAiEngine(data.generated_by || 'AI Engine')
      onShowToast('AI Performance Summary generated!', 'success')
      setActiveTab('dashboard')
    } catch (err) {
      onShowToast(err.message || 'Failed to generate AI summary.', 'error')
    } finally {
      setIsGeneratingAi(false)
    }
  }

  return (
    <div className="educore-app-layout">
      {/* LEFT ROYAL NAVY SIDEBAR */}
      <Sidebar
        role="teacher"
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'ai-summary') {
            handleTriggerAiSummary()
          } else {
            setActiveTab(tab)
          }
        }}
        currentUser={teacherUser}
        onLogout={onLogout}
        onBackToHome={onBackToHome}
      />

      {/* MAIN VIEWPORT */}
      <div className="educore-main-viewport">
        <TopHeader
          title={teacherUser?.name || 'Faculty Dashboard'}
          subtitle={`${dashboardData?.college_name || teacherUser?.college_name || 'College'} • ${dashboardData?.department || teacherUser?.department} (${dashboardData?.subject || teacherUser?.subject})`}
          searchPlaceholder="Search student by name, roll no..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          currentUser={teacherUser}
          onLogout={onLogout}
          actionButton={
            <button
              className="topbar-action-btn ai-btn"
              onClick={handleTriggerAiSummary}
              disabled={isGeneratingAi || students.length === 0}
            >
              {isGeneratingAi ? '✨ Analyzing Top 3...' : '🤖 AI Summary'}
            </button>
          }
        />

        <div className="educore-canvas-body">
          {loading ? (
            <div className="loading-spinner-box">
              <div className="spinner"></div>
              <p>Loading class records...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: DASHBOARD */}
              {activeTab === 'dashboard' && (
                <div className="teacher-dashboard-view">
                  <div className="overview-header-row">
                    <div>
                      <h2>Class Performance Overview</h2>
                      <p className="subtext">Daily metrics and academic progress for your assigned students.</p>
                    </div>
                    <button className="primary-button" onClick={() => setActiveTab('add-student')}>
                      + Add New Student
                    </button>
                  </div>

                  {/* 4 Stat Metric Cards */}
                  <div className="college-metrics-row">
                    <div className="educore-stat-card icon-card">
                      <div className="metric-content">
                        <span className="stat-label">ASSIGNED STUDENTS</span>
                        <strong className="stat-big-number">{dashboardData?.total_students || students.length}</strong>
                        <span className="stat-growth-tag tag-positive">Active in class</span>
                      </div>
                      <div className="circular-icon-box icon-blue">🎓</div>
                    </div>

                    <div className="educore-stat-card icon-card">
                      <div className="metric-content">
                        <span className="stat-label">CLASS AVG MARKS</span>
                        <strong className="stat-big-number">{dashboardData?.average_marks || 0}%</strong>
                        <span className="stat-growth-tag tag-positive">Academic Average</span>
                      </div>
                      <div className="circular-icon-box icon-amber">⭐</div>
                    </div>

                    <div className="educore-stat-card icon-card">
                      <div className="metric-content">
                        <span className="stat-label">CLASS AVG ATTENDANCE</span>
                        <strong className="stat-big-number">{dashboardData?.average_attendance || 0}%</strong>
                        <span className="stat-growth-tag tag-positive">Attendance Rate</span>
                      </div>
                      <div className="circular-icon-box icon-green">📅</div>
                    </div>

                    <div className="educore-stat-card icon-card" onClick={handleTriggerAiSummary} style={{ cursor: 'pointer' }}>
                      <div className="metric-content">
                        <span className="stat-label">AI TOP 3 INSIGHTS</span>
                        <strong className="stat-big-number stat-ai">{students.length >= 3 ? 'Top 3 Ready' : `${students.length}/3`}</strong>
                        <span className="stat-growth-tag tag-ai">Click to Run &rarr;</span>
                      </div>
                      <div className="circular-icon-box icon-purple">🤖</div>
                    </div>
                  </div>

                  {/* AI SUMMARY COMPONENT (IF GENERATED) */}
                  {topStudents.length > 0 && (
                    <AISummary
                      topStudents={topStudents}
                      aiSummary={aiSummary}
                      aiEngine={aiEngine}
                      onDismiss={() => { setTopStudents([]); setAiSummary('') }}
                    />
                  )}

                  {/* STUDENT TABLE */}
                  <StudentList
                    students={students}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onMarksClick={(student) => setSelectedStudentForMarks(student)}
                    onAttendanceClick={(student) => setSelectedStudentForAttendance(student)}
                    onViewClick={(studentId) => setSelectedStudentForDetails(studentId)}
                    onEditClick={(student) => setSelectedStudentForEdit(student)}
                    onDeleteClick={handleDeleteStudent}
                    onAddNewClick={() => setActiveTab('add-student')}
                  />
                </div>
              )}

              {/* TAB 2: MY STUDENTS */}
              {activeTab === 'students' && (
                <StudentList
                  students={students}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onMarksClick={(student) => setSelectedStudentForMarks(student)}
                  onAttendanceClick={(student) => setSelectedStudentForAttendance(student)}
                  onViewClick={(studentId) => setSelectedStudentForDetails(studentId)}
                  onEditClick={(student) => setSelectedStudentForEdit(student)}
                  onDeleteClick={handleDeleteStudent}
                  onAddNewClick={() => setActiveTab('add-student')}
                />
              )}

              {/* TAB 3: ADD STUDENT */}
              {activeTab === 'add-student' && (
                <AddStudent
                  defaultDepartment={teacherUser?.department || 'Computer Science'}
                  onStudentAdded={(msg) => {
                    onShowToast(msg, 'success')
                    setActiveTab('dashboard')
                    loadData()
                  }}
                  onCancel={() => setActiveTab('dashboard')}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* MARKS MODAL */}
      {selectedStudentForMarks && (
        <MarksModal
          student={selectedStudentForMarks}
          isOpen={Boolean(selectedStudentForMarks)}
          onClose={() => setSelectedStudentForMarks(null)}
          onMarksSaved={() => {
            onShowToast('Marks recorded successfully!', 'success')
            loadData()
          }}
        />
      )}

      {/* ATTENDANCE MODAL */}
      {selectedStudentForAttendance && (
        <AttendanceModal
          student={selectedStudentForAttendance}
          isOpen={Boolean(selectedStudentForAttendance)}
          onClose={() => setSelectedStudentForAttendance(null)}
          onAttendanceSaved={() => {
            onShowToast('Attendance updated successfully!', 'success')
            loadData()
          }}
        />
      )}

      {/* STUDENT DETAILS MODAL */}
      {selectedStudentForDetails && (
        <StudentDetailsModal
          studentId={selectedStudentForDetails}
          isOpen={Boolean(selectedStudentForDetails)}
          onClose={() => setSelectedStudentForDetails(null)}
          onEditClick={(student) => setSelectedStudentForEdit(student)}
          onMarksClick={(student) => setSelectedStudentForMarks(student)}
          onAttendanceClick={(student) => setSelectedStudentForAttendance(student)}
        />
      )}

      {/* EDIT STUDENT MODAL */}
      {selectedStudentForEdit && (
        <EditStudentModal
          student={selectedStudentForEdit}
          isOpen={Boolean(selectedStudentForEdit)}
          onClose={() => setSelectedStudentForEdit(null)}
          onStudentUpdated={() => {
            onShowToast('Student profile updated!', 'success')
            loadData()
          }}
        />
      )}
    </div>
  )
}
