export default function TopHeader({
  title,
  subtitle,
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  currentUser,
  onLogout,
  showDate = true,
  actionButton,
}) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <header className="educore-topbar">
      <div className="topbar-left">
        {title && <h1 className="topbar-title">{title}</h1>}
        {subtitle && <p className="topbar-subtitle">{subtitle}</p>}
      </div>

      <div className="topbar-right">
        {onSearchChange && (
          <div className="topbar-search">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}

        <div className="topbar-actions">
          {showDate && (
            <div className="topbar-date-pill">
              📅 <span>{currentDate}</span>
            </div>
          )}

          {actionButton}

          <button className="topbar-icon-btn" title="Notifications">
            🔔
            <span className="icon-badge-dot"></span>
          </button>

          <button className="topbar-icon-btn" title="Help & Documentation">
            ❓
          </button>

          {currentUser && (
            <button className="topbar-signout-btn" onClick={onLogout}>
              Sign Out
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
