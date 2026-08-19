export default function Navbar({ currentUser, onLogout, onSeedDemo, setView }) {
  return (
    <header className="page-header">
      <div className="brand-group" onClick={() => !currentUser && setView('home')} style={{ cursor: !currentUser ? 'pointer' : 'default' }}>
        <div className="brand-badge">SMS</div>
        <div>
          <p className="eyebrow">Role-Based Academic Portal</p>
          <h1 className="header-title">Student Management System</h1>
        </div>
      </div>

      <div className="header-actions">
        {!currentUser && (
          <button className="seed-btn" onClick={onSeedDemo} title="Populate demo College, Teacher, Students, Marks & Attendance">
            🌱 Load Demo Data
          </button>
        )}

        {currentUser && (
          <div className="user-badge-container">
            <span className={`role-pill role-${currentUser.role}`}>
              {currentUser.role.toUpperCase()}
            </span>
            <span className="user-name">
              {currentUser.role === 'admin' && (currentUser.username || 'System Admin')}
              {currentUser.role === 'college' && (currentUser.college_name || 'College')}
              {currentUser.role === 'teacher' && (currentUser.name || 'Teacher')}
            </span>
            <button className="logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
