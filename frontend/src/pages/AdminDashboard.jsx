import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminApi } from '../services/api'
import Sidebar from '../components/Sidebar'
import TopHeader from '../components/TopHeader'
import Modal from '../components/Modal'

export default function AdminDashboard({ adminUser, onShowToast, onLogout, onBackToHome }) {
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard', 'requests', 'directory', 'management', 'reports', 'settings'
  const [stats, setStats] = useState(null)
  const [colleges, setColleges] = useState([])
  const [requestsFilter, setRequestsFilter] = useState('PENDING') // 'PENDING', 'APPROVED', 'REJECTED', 'INACTIVE', 'ALL'
  const [tableSearch, setTableSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Reason modal state
  const [reasonModal, setReasonModal] = useState({ isOpen: false, type: '', collegeId: null, collegeName: '', reason: '' })

  // College Details & Teachers modal state
  const [collegeDetailsModal, setCollegeDetailsModal] = useState({ isOpen: false, college: null, teachers: [] })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsData, collegesData] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getColleges(),
      ])
      setStats(statsData)
      setColleges(collegesData)
    } catch (err) {
      onShowToast(err.message || 'Failed to load admin dashboard data.', 'error')
    } finally {
      setLoading(false)
    }
  }, [onShowToast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleApprove = async (college) => {
    try {
      const res = await adminApi.approveCollege(college.id)
      onShowToast(res.message, 'success')
      loadData()
    } catch (err) {
      onShowToast(err.message || 'Failed to approve college.', 'error')
    }
  }

  const handleActivate = async (college) => {
    try {
      const res = await adminApi.activateCollege(college.id)
      onShowToast(res.message, 'success')
      loadData()
    } catch (err) {
      onShowToast(err.message || 'Failed to activate college.', 'error')
    }
  }

  const openReasonModal = (type, college) => {
    setReasonModal({
      isOpen: true,
      type,
      collegeId: college.id,
      collegeName: college.college_name,
      reason: '',
    })
  }

  const handleReasonSubmit = async (e) => {
    e.preventDefault()
    const { type, collegeId, reason } = reasonModal
    try {
      let res
      if (type === 'reject') {
        res = await adminApi.rejectCollege(collegeId, reason)
      } else if (type === 'deactivate') {
        res = await adminApi.deactivateCollege(collegeId, reason)
      }
      onShowToast(res.message, 'success')
      setReasonModal({ isOpen: false, type: '', collegeId: null, collegeName: '', reason: '' })
      loadData()
    } catch (err) {
      onShowToast(err.message || 'Action failed.', 'error')
    }
  }

  const viewCollegeTeachers = async (college) => {
    try {
      const data = await adminApi.getCollegeTeachers(college.id)
      setCollegeDetailsModal({
        isOpen: true,
        college: data.college,
        teachers: data.teachers,
      })
    } catch (err) {
      onShowToast(err.message || 'Failed to load college teachers.', 'error')
    }
  }

  const filteredRequests = useMemo(() => {
    let list = colleges
    if (requestsFilter === 'PENDING') list = colleges.filter((c) => c.approval_status === 'PENDING')
    else if (requestsFilter === 'APPROVED') list = colleges.filter((c) => c.approval_status === 'APPROVED' && c.is_active)
    else if (requestsFilter === 'REJECTED') list = colleges.filter((c) => c.approval_status === 'REJECTED')
    else if (requestsFilter === 'INACTIVE') list = colleges.filter((c) => !c.is_active && c.approval_status === 'APPROVED')

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase()
      list = list.filter(
        (c) =>
          c.college_name.toLowerCase().includes(q) ||
          c.university_name.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      )
    }
    return list
  }, [colleges, requestsFilter, tableSearch])

  const pendingCount = stats?.pending_colleges || 0

  return (
    <div className="educore-app-layout">
      {/* LEFT ROYAL NAVY SIDEBAR */}
      <Sidebar
        role="admin"
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        currentUser={adminUser}
        onLogout={onLogout}
        onBackToHome={onBackToHome}
        pendingCount={pendingCount}
      />

      {/* MAIN CONTENT AREA */}
      <div className="educore-main-viewport">
        <TopHeader
          title={activeTab === 'dashboard' ? 'Admin Dashboard' : activeTab === 'requests' ? 'College Requests Management' : 'Admin Portal'}
          subtitle={activeTab === 'dashboard' ? 'System overview and pending actions.' : 'Review and manage registration requests from affiliated institutions.'}
          searchPlaceholder={activeTab === 'requests' ? 'Search requests...' : 'Search colleges, teachers, students...'}
          searchValue={tableSearch}
          onSearchChange={setTableSearch}
          currentUser={adminUser}
          onLogout={onLogout}
        />

        <div className="educore-canvas-body">
          {loading ? (
            <div className="loading-spinner-box">
              <div className="spinner"></div>
              <p>Loading administration data...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: DASHBOARD OVERVIEW (Matching Screenshot 3) */}
              {activeTab === 'dashboard' && (
                <div className="admin-overview-grid">
                  {/* Metric Stat Cards */}
                  <div className="admin-stat-row">
                    <div className="educore-stat-card">
                      <div className="stat-card-header">
                        <span className="stat-icon-badge icon-navy">🏛️</span>
                        <span className="stat-label">TOTAL COLLEGES</span>
                      </div>
                      <strong className="stat-big-number">{stats?.total_colleges || colleges.length}</strong>
                      <span className="stat-growth-tag tag-positive">↗ +5% this month</span>
                    </div>

                    <div className="educore-stat-card" onClick={() => { setActiveTab('requests'); setRequestsFilter('PENDING') }} style={{ cursor: 'pointer' }}>
                      <div className="stat-card-header">
                        <span className="stat-icon-badge icon-amber">⏳</span>
                        <span className="stat-label">PENDING</span>
                      </div>
                      <strong className="stat-big-number stat-amber">{stats?.pending_colleges || 0}</strong>
                      <span className="stat-growth-tag tag-neutral">Requires Review &rarr;</span>
                    </div>

                    <div className="educore-stat-card" onClick={() => { setActiveTab('requests'); setRequestsFilter('APPROVED') }} style={{ cursor: 'pointer' }}>
                      <div className="stat-card-header">
                        <span className="stat-icon-badge icon-teal">✓</span>
                        <span className="stat-label">APPROVED</span>
                      </div>
                      <strong className="stat-big-number stat-teal">{stats?.approved_colleges || 0}</strong>
                      <span className="stat-growth-tag tag-positive">Active Institutions</span>
                    </div>

                    <div className="educore-stat-card" onClick={() => { setActiveTab('requests'); setRequestsFilter('INACTIVE') }} style={{ cursor: 'pointer' }}>
                      <div className="stat-card-header">
                        <span className="stat-icon-badge icon-red">✕</span>
                        <span className="stat-label">INACTIVE</span>
                      </div>
                      <strong className="stat-big-number stat-red">{stats?.inactive_colleges || 0}</strong>
                      <span className="stat-growth-tag tag-negative">Suspended</span>
                    </div>
                  </div>

                  {/* Secondary Faculty & Student Totals */}
                  <div className="admin-secondary-stats">
                    <div className="educore-stat-card wide-stat">
                      <span className="stat-label">👨‍🏫 TOTAL FACULTY</span>
                      <strong className="stat-big-number">{stats?.total_teachers || 0}</strong>
                      <span className="stat-subtext">Registered teachers across institutions</span>
                    </div>
                    <div className="educore-stat-card wide-stat">
                      <span className="stat-label">🎓 TOTAL STUDENTS</span>
                      <strong className="stat-big-number">{stats?.total_students || 0}</strong>
                      <span className="stat-subtext">Active student enrollments in system</span>
                    </div>
                  </div>

                  {/* Visual Charts Row */}
                  <div className="admin-charts-row">
                    <div className="educore-panel chart-panel">
                      <div className="panel-title-bar">
                        <h4>Registration Trends</h4>
                        <span className="panel-badge-pill">Annual</span>
                      </div>
                      <div className="mock-bar-chart">
                        <div className="chart-bar-col"><div className="bar-val" style={{ height: '35%' }}></div><span>Jan</span></div>
                        <div className="chart-bar-col"><div className="bar-val" style={{ height: '48%' }}></div><span>Feb</span></div>
                        <div className="chart-bar-col"><div className="bar-val" style={{ height: '70%' }}></div><span>Mar</span></div>
                        <div className="chart-bar-col"><div className="bar-val" style={{ height: '55%' }}></div><span>Apr</span></div>
                        <div className="chart-bar-col"><div className="bar-val" style={{ height: '85%' }}></div><span>May</span></div>
                        <div className="chart-bar-col"><div className="bar-val active" style={{ height: '95%' }}></div><span>Jun</span></div>
                      </div>
                    </div>

                    <div className="educore-panel chart-panel">
                      <div className="panel-title-bar">
                        <h4>Student Growth</h4>
                        <span className="panel-badge-pill">Overview</span>
                      </div>
                      <div className="mock-donut-chart-container">
                        <div className="donut-ring-visual">
                          <div className="donut-center-text">
                            <strong>85.2k</strong>
                            <small>Enrolled</small>
                          </div>
                        </div>
                        <div className="donut-legend">
                          <div className="legend-item"><span className="dot dot-navy"></span> Engineering (46%)</div>
                          <div className="legend-item"><span className="dot dot-teal"></span> Business (30%)</div>
                          <div className="legend-item"><span className="dot dot-amber"></span> Arts & Science (24%)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: REQUESTS MANAGEMENT (Matching Screenshot 4) */}
              {(activeTab === 'requests' || activeTab === 'directory' || activeTab === 'management') && (
                <div className="requests-management-view">
                  <div className="requests-filter-toolbar">
                    <div className="requests-pill-tabs">
                      <button
                        className={`pill-tab ${requestsFilter === 'PENDING' ? 'active' : ''}`}
                        onClick={() => setRequestsFilter('PENDING')}
                      >
                        Pending ({stats?.pending_colleges || 0})
                      </button>
                      <button
                        className={`pill-tab ${requestsFilter === 'APPROVED' ? 'active' : ''}`}
                        onClick={() => setRequestsFilter('APPROVED')}
                      >
                        Approved
                      </button>
                      <button
                        className={`pill-tab ${requestsFilter === 'REJECTED' ? 'active' : ''}`}
                        onClick={() => setRequestsFilter('REJECTED')}
                      >
                        Rejected
                      </button>
                      <button
                        className={`pill-tab ${requestsFilter === 'INACTIVE' ? 'active' : ''}`}
                        onClick={() => setRequestsFilter('INACTIVE')}
                      >
                        Inactive
                      </button>
                      <button
                        className={`pill-tab ${requestsFilter === 'ALL' ? 'active' : ''}`}
                        onClick={() => setRequestsFilter('ALL')}
                      >
                        All
                      </button>
                    </div>

                    <div className="requests-search-box">
                      <input
                        type="text"
                        placeholder="Search table..."
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Requests Data Table */}
                  <div className="educore-panel table-panel">
                    {filteredRequests.length === 0 ? (
                      <div className="empty-state">
                        <p>No colleges found in this category.</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="educore-table">
                          <thead>
                            <tr>
                              <th>COLLEGE</th>
                              <th>UNIVERSITY</th>
                              <th>LOCATION</th>
                              <th>TYPE</th>
                              <th>REGISTERED</th>
                              <th>STATUS</th>
                              <th style={{ textAlign: 'center' }}>ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredRequests.map((college, idx) => {
                              const badgeColors = ['badge-blue', 'badge-teal', 'badge-purple', 'badge-amber']
                              const badgeColor = badgeColors[idx % badgeColors.length]
                              const initial = college.college_name?.[0] || 'C'

                              return (
                                <tr key={college.id}>
                                  <td>
                                    <div className="college-cell-group">
                                      <span className={`college-avatar-box ${badgeColor}`}>
                                        {initial}
                                      </span>
                                      <div>
                                        <strong className="college-main-name">{college.college_name}</strong>
                                        <small className="college-id-sub">ID: REQ-{college.id + 8700}</small>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="university-cell-name">{college.university_name}</div>
                                  </td>
                                  <td>
                                    <div className="location-cell">
                                      📍 {college.city}, {college.state}
                                    </div>
                                  </td>
                                  <td>
                                    <span className="type-tag">{college.college_type}</span>
                                  </td>
                                  <td>
                                    <span className="date-cell">
                                      {new Date(college.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`status-badge-pill status-${college.approval_status.toLowerCase()} ${!college.is_active && college.approval_status === 'APPROVED' ? 'status-inactive' : ''}`}>
                                      {college.approval_status === 'APPROVED' && !college.is_active ? 'Inactive' : college.approval_status}
                                    </span>
                                  </td>
                                  <td>
                                    <div className="action-button-group center">
                                      {college.approval_status === 'PENDING' && (
                                        <>
                                          <button
                                            className="action-btn btn-approve"
                                            onClick={() => handleApprove(college)}
                                            title="Approve College"
                                          >
                                            ✓ Approve
                                          </button>
                                          <button
                                            className="action-btn btn-reject"
                                            onClick={() => openReasonModal('reject', college)}
                                            title="Reject College"
                                          >
                                            ✕ Reject
                                          </button>
                                        </>
                                      )}

                                      {college.approval_status === 'APPROVED' && college.is_active && (
                                        <button
                                          className="action-btn btn-deactivate"
                                          onClick={() => openReasonModal('deactivate', college)}
                                          title="Deactivate College"
                                        >
                                          Deactivate
                                        </button>
                                      )}

                                      {college.approval_status === 'APPROVED' && !college.is_active && (
                                        <button
                                          className="action-btn btn-activate"
                                          onClick={() => handleActivate(college)}
                                          title="Activate College"
                                        >
                                          Activate
                                        </button>
                                      )}

                                      <button
                                        className="action-btn btn-view"
                                        onClick={() => viewCollegeTeachers(college)}
                                        title="View Faculty & Details"
                                      >
                                        👁️ Details
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: REPORTS / SETTINGS */}
              {(activeTab === 'reports' || activeTab === 'settings') && (
                <div className="educore-panel">
                  <h3>{activeTab === 'reports' ? 'System Reports & Audit Log' : 'Global Settings'}</h3>
                  <p className="subtext">Configure administrative governance and review system audit history.</p>
                  <div className="empty-state">
                    <p>All institutional controls and database states are operating normally.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Rejection / Deactivation Modal */}
      <Modal
        title={`${reasonModal.type === 'reject' ? 'Reject Registration' : 'Deactivate College'}: ${reasonModal.collegeName}`}
        isOpen={reasonModal.isOpen}
        onClose={() => setReasonModal({ isOpen: false, type: '', collegeId: null, collegeName: '', reason: '' })}
      >
        <form onSubmit={handleReasonSubmit} className="stack-form">
          <p className="subtext">
            Please record the mandatory reason for this {reasonModal.type === 'reject' ? 'rejection' : 'deactivation'}:
          </p>
          <textarea
            className="form-textarea"
            rows="4"
            value={reasonModal.reason}
            onChange={(e) => setReasonModal({ ...reasonModal, reason: e.target.value })}
            placeholder="Enter specific audit reason or feedback for the institution..."
            required
          />
          <div className="button-row">
            <button className="portal-role-btn" type="submit">
              Confirm {reasonModal.type === 'reject' ? 'Rejection' : 'Deactivation'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setReasonModal({ isOpen: false, type: '', collegeId: null, collegeName: '', reason: '' })}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* College Profile & Faculty Drilldown Modal */}
      <Modal
        title={`Institution Profile: ${collegeDetailsModal.college?.college_name || ''}`}
        isOpen={collegeDetailsModal.isOpen}
        onClose={() => setCollegeDetailsModal({ isOpen: false, college: null, teachers: [] })}
        maxWidth="760px"
      >
        {collegeDetailsModal.college && (
          <div className="student-profile-view">
            <ul className="key-value-list">
              <li><span>University</span><strong>{collegeDetailsModal.college.university_name}</strong></li>
              <li><span>Official Email</span><strong>{collegeDetailsModal.college.email}</strong></li>
              <li><span>Contact Phone</span><strong>{collegeDetailsModal.college.phone}</strong></li>
              <li><span>Campus Address</span><strong>{collegeDetailsModal.college.address}, {collegeDetailsModal.college.city}, {collegeDetailsModal.college.state} - {collegeDetailsModal.college.pincode}</strong></li>
              <li><span>Website</span><strong>{collegeDetailsModal.college.website || 'N/A'}</strong></li>
              <li><span>Institution Type</span><strong>{collegeDetailsModal.college.college_type}</strong></li>
              <li><span>Status</span><strong>{collegeDetailsModal.college.approval_status} ({collegeDetailsModal.college.is_active ? 'Active' : 'Inactive'})</strong></li>
              {collegeDetailsModal.college.rejection_reason && (
                <li><span>Rejection Reason</span><strong style={{ color: '#dc2626' }}>{collegeDetailsModal.college.rejection_reason}</strong></li>
              )}
              {collegeDetailsModal.college.deactivation_reason && (
                <li><span>Deactivation Reason</span><strong style={{ color: '#dc2626' }}>{collegeDetailsModal.college.deactivation_reason}</strong></li>
              )}
            </ul>

            <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>Faculty Teachers ({collegeDetailsModal.teachers.length})</h4>
            {collegeDetailsModal.teachers.length === 0 ? (
              <p className="subtext">No teachers created yet by this college.</p>
            ) : (
              <table className="educore-table compact">
                <thead>
                  <tr>
                    <th>Teacher Name</th>
                    <th>Login Email</th>
                    <th>Department</th>
                    <th>Subject</th>
                    <th>Assigned Students</th>
                  </tr>
                </thead>
                <tbody>
                  {collegeDetailsModal.teachers.map((t) => (
                    <tr key={t.id}>
                      <td><strong>{t.name}</strong></td>
                      <td>{t.email}</td>
                      <td>{t.department}</td>
                      <td><span className="type-tag">{t.subject}</span></td>
                      <td><strong>{t.student_count || 0}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="button-row" style={{ marginTop: '20px' }}>
              <button
                className="secondary-button"
                onClick={() => setCollegeDetailsModal({ isOpen: false, college: null, teachers: [] })}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
