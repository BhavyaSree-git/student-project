export default function Sidebar({
  role = 'admin',
  activeTab = 'dashboard',
  onTabChange,
  currentUser,
  onLogout,
  onBackToHome,
  pendingCount = 0,
  canManage = true,
}) {
  const getNavItems = () => {
    if (role === 'admin') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'requests', label: 'Requests', icon: '📝', badge: pendingCount > 0 ? pendingCount : null },
        { id: 'directory', label: 'Directory', icon: '📁' },
        { id: 'management', label: 'Management', icon: '⚙️' },
        { id: 'reports', label: 'Reports', icon: '📈' },
      ]
    }
    if (role === 'college') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'teachers', label: 'Teachers', icon: '👨‍🏫' },
        { id: 'create-teacher', label: 'Create Teacher', icon: '➕' },
        { id: 'students', label: 'Students', icon: '🎓' },
        { id: 'profile', label: 'College Profile', icon: '🏛️' },
      ]
    }
    // Teacher
    return [
      { id: 'dashboard', label: 'Dashboard', icon: '📊' },
      { id: 'students', label: 'My Students', icon: '🎓' },
      { id: 'add-student', label: 'Add Student', icon: '➕' },
      { id: 'ai-summary', label: 'AI Summary', icon: '🤖' },
    ]
  }

  const navItems = getNavItems()

  return (
    <aside className="educore-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand" onClick={onBackToHome} style={{ cursor: 'pointer' }}>
        <div className="sidebar-brand-icon">🏛️</div>
        <div>
          <h2 className="sidebar-brand-title">EduCore SMS</h2>
          <span className="sidebar-brand-sub">Institutional Portal</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isLockedAction = role === 'college' && !canManage && ['teachers', 'create-teacher', 'students'].includes(item.id)
          return (
            <button
              key={item.id}
              className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => !isLockedAction && onTabChange(item.id)}
              disabled={isLockedAction}
              style={isLockedAction ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            >
              <span className="nav-item-icon">{item.icon}</span>
              <span className="nav-item-label">{item.label}</span>
              {item.badge && <span className="nav-item-badge">{item.badge}</span>}
            </button>
          )
        })}
      </nav>

      {/* Footer / User Profile Card */}
      <div className="sidebar-footer">
        <button
          className={`sidebar-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => onTabChange('settings')}
          style={{ marginBottom: '12px' }}
        >
          <span className="nav-item-icon">⚙️</span>
          <span className="nav-item-label">Settings</span>
        </button>

        {currentUser && (
          <div className="sidebar-user-card">
            <div className="sidebar-avatar">
              {currentUser.username?.[0] || currentUser.college_name?.[0] || currentUser.name?.[0] || 'U'}
            </div>
            <div className="sidebar-user-info">
              <strong>{currentUser.username || currentUser.name || currentUser.college_name}</strong>
              <small>{currentUser.role === 'admin' ? 'System Administrator' : currentUser.role === 'college' ? 'Dean / Administrator' : 'Faculty Instructor'}</small>
            </div>
            <button className="sidebar-signout-icon" onClick={onLogout} title="Sign Out">
              🚪
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
