export default function TeacherList({ teachers, onDeleteTeacher, onAddNewClick }) {
  return (
    <div className="panel list-panel">
      <div className="panel-header-row">
        <div>
          <h3>Faculty Teachers</h3>
          <p className="subtext">Faculty members who can log in and manage students, marks, and attendance.</p>
        </div>
        {onAddNewClick && (
          <button className="primary-button" onClick={onAddNewClick}>
            + Create New Teacher
          </button>
        )}
      </div>

      {(!teachers || teachers.length === 0) ? (
        <div className="empty-state">
          <p>No teachers registered yet.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Faculty Name</th>
                <th>Login Email</th>
                <th>Department</th>
                <th>Subject Handled</th>
                <th>Assigned Students</th>
                {onDeleteTeacher && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td><strong>{teacher.name}</strong></td>
                  <td>{teacher.email}</td>
                  <td>{teacher.department}</td>
                  <td><span className="tag">{teacher.subject}</span></td>
                  <td><strong>{teacher.student_count || 0}</strong></td>
                  {onDeleteTeacher && (
                    <td>
                      <button
                        className="action-btn btn-reject"
                        onClick={() => onDeleteTeacher(teacher)}
                        title="Delete Teacher"
                      >
                        🗑️ Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
