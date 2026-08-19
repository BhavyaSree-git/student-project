export default function StudentDetails({ details, onEditClick, onMarksClick, onAttendanceClick, onClose }) {
  if (!details) return null

  return (
    <div className="student-profile-view">
      <div className="profile-header-card">
        <div>
          <h3>{details.name}</h3>
          <p className="subtext">
            ID: <strong>{details.student_id}</strong> &bull; {details.department} &bull; {details.course} ({details.year} - Sec {details.section})
          </p>
        </div>
        <div className="profile-quick-stats">
          <div className="badge-stat">
            <span>Avg Marks</span>
            <strong>{details.average_marks}%</strong>
          </div>
          <div className="badge-stat">
            <span>Attendance</span>
            <strong>{details.attendance_percentage}%</strong>
          </div>
        </div>
      </div>

      <div className="profile-grid">
        <div className="profile-section">
          <h4>Contact & Personal Information</h4>
          <ul className="key-value-list">
            <li><span>Email</span><strong>{details.email}</strong></li>
            <li><span>Phone</span><strong>{details.phone}</strong></li>
            <li><span>Date of Birth</span><strong>{details.date_of_birth}</strong></li>
            <li><span>Gender</span><strong>{details.gender}</strong></li>
          </ul>
        </div>

        <div className="profile-section">
          <h4>Attendance Overview</h4>
          <ul className="key-value-list">
            <li><span>Total Classes</span><strong>{details.attendance?.total_classes || 0}</strong></li>
            <li><span>Present</span><strong style={{ color: '#16a34a' }}>{details.attendance?.present || 0}</strong></li>
            <li><span>Absent</span><strong style={{ color: '#dc2626' }}>{details.attendance?.absent || 0}</strong></li>
            <li><span>Attendance %</span><strong>{details.attendance?.attendance_percentage || 0}%</strong></li>
          </ul>
        </div>
      </div>

      <div className="profile-section" style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ margin: 0 }}>Subject Marks Breakdown</h4>
          {onMarksClick && (
            <button
              className="secondary-button"
              style={{ padding: '4px 10px', fontSize: '0.8rem' }}
              onClick={() => onMarksClick(details)}
            >
              ✏️ Edit Marks
            </button>
          )}
        </div>

        {(!details.marks_list || details.marks_list.length === 0) ? (
          <p className="subtext">No marks entered yet.</p>
        ) : (
          <table className="data-table compact">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Marks</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {details.marks_list.map((m) => (
                <tr key={m.id}>
                  <td>{m.subject}</td>
                  <td><strong>{m.marks} / 100</strong></td>
                  <td>
                    <span className={`status-pill ${m.marks >= 40 ? 'status-approved' : 'status-rejected'}`}>
                      {m.marks >= 40 ? 'Passed' : 'Needs Attention'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="button-row" style={{ marginTop: '20px' }}>
        {onEditClick && (
          <button className="primary-button" onClick={() => onEditClick(details)}>
            Edit Student Details
          </button>
        )}
        {onAttendanceClick && (
          <button className="secondary-button" onClick={() => onAttendanceClick(details)}>
            Update Attendance
          </button>
        )}
        {onClose && (
          <button className="secondary-button" onClick={onClose}>
            Close
          </button>
        )}
      </div>
    </div>
  )
}
