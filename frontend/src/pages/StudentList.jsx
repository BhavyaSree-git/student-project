export default function StudentList({
  students,
  searchQuery,
  onSearchChange,
  onMarksClick,
  onAttendanceClick,
  onViewClick,
  onEditClick,
  onDeleteClick,
  onAddNewClick,
}) {
  return (
    <div className="panel list-panel">
      <div className="panel-header-row">
        <div>
          <h3>Student Performance Directory</h3>
          <p className="subtext">Manage student profiles, record subject-wise marks, update attendance, and view detailed progress.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span className="count-badge">{students.length} Students</span>
          {onAddNewClick && (
            <button className="primary-button" onClick={onAddNewClick}>
              + Add Student
            </button>
          )}
        </div>
      </div>

      {onSearchChange && (
        <div style={{ marginBottom: '16px', maxWidth: '360px' }}>
          <input
            type="text"
            placeholder="🔍 Search by name, roll no, department..."
            value={searchQuery || ''}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      )}

      {students.length === 0 ? (
        <div className="empty-state">
          <p>{searchQuery ? 'No students match your search criteria.' : 'No students found.'}</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Roll / ID</th>
                <th>Student Name</th>
                <th>Course & Year</th>
                <th>Avg Marks</th>
                <th>Attendance %</th>
                <th style={{ textAlign: 'center' }}>Academic Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td>
                    <span className="student-id-badge">{student.student_id}</span>
                  </td>
                  <td>
                    <strong>{student.name}</strong>
                    <div className="subtext">{student.email}</div>
                  </td>
                  <td>
                    <div>{student.course} ({student.year})</div>
                    <small className="subtext">{student.department} &bull; Sec {student.section}</small>
                  </td>
                  <td>
                    <div className="marks-cell">
                      <strong>{student.average_marks}%</strong>
                      <small className="subtext">({student.marks_count || 0} subjects)</small>
                    </div>
                  </td>
                  <td>
                    <div className="attendance-cell">
                      <span className={`status-pill ${student.attendance_percentage >= 75 ? 'status-active' : student.attendance_percentage >= 60 ? 'status-pending' : 'status-rejected'}`}>
                        {student.attendance_percentage}%
                      </span>
                      <small className="subtext">
                        {student.attendance?.present || 0} / {student.attendance?.total_classes || 0} classes
                      </small>
                    </div>
                  </td>
                  <td>
                    <div className="action-button-group center">
                      {onMarksClick && (
                        <button
                          className="action-btn btn-marks"
                          onClick={() => onMarksClick(student)}
                          title="Enter / Update Subject Marks"
                        >
                          📝 Marks
                        </button>
                      )}
                      {onAttendanceClick && (
                        <button
                          className="action-btn btn-attendance"
                          onClick={() => onAttendanceClick(student)}
                          title="Update Attendance"
                        >
                          📅 Attendance
                        </button>
                      )}
                      {onViewClick && (
                        <button
                          className="action-btn btn-view"
                          onClick={() => onViewClick(student.id)}
                          title="View Full Profile"
                        >
                          👁️ View
                        </button>
                      )}
                      {onEditClick && (
                        <button
                          className="action-btn btn-edit"
                          onClick={() => onEditClick(student)}
                          title="Edit Student Info"
                        >
                          ✏️ Edit
                        </button>
                      )}
                      {onDeleteClick && (
                        <button
                          className="action-btn btn-delete"
                          onClick={() => onDeleteClick(student)}
                          title="Delete Student"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
