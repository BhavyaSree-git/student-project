export default function ProtectedRoute({ currentUser, allowedRoles = [], children, onUnauthorized }) {
  if (!currentUser) {
    if (onUnauthorized) onUnauthorized()
    return null
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    return (
      <div className="panel empty-state">
        <h3>Access Denied</h3>
        <p>You do not have permission to view this page ({currentUser.role} role is not permitted).</p>
      </div>
    )
  }

  return children
}
