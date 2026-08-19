import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import LandingPage from './pages/LandingPage'
import {
  RoleSelector,
  AdminLoginForm,
  CollegeLoginForm,
  CollegeRegisterForm,
  TeacherLoginForm,
} from './pages/AuthPages'
import AdminDashboard from './pages/AdminDashboard'
import CollegeDashboard from './pages/CollegeDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import ResetTeacherPassword from './pages/ResetTeacherPassword'
import { authApi } from './services/api'

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [view, setView] = useState('landing') // 'landing', 'role-selector', 'admin-login', 'college-login', 'college-register', 'teacher-login', 'admin-dashboard', 'college-dashboard', 'teacher-dashboard'
  const [toast, setToast] = useState(null)
  const [initializing, setInitializing] = useState(true)
  const currentUserRef = useRef(null)

  const normalizeUser = (user, fallbackRole) => {
    if (!user) return null

    const inferredRole = user.role || fallbackRole || (
      user.username ? 'admin' :
        user.college_name ? 'college' :
          user.department || user.subject ? 'teacher' :
            'admin'
    )

    return {
      ...user,
      role: inferredRole,
    }
  }

  useEffect(() => {
    currentUserRef.current = currentUser
  }, [currentUser])

  const showToast = useCallback((message, type = 'success') => {
    const text = typeof message === 'string' ? message : 'Something went wrong.'
    setToast({ message: text, type })
    setTimeout(() => {
      setToast(null)
    }, 4500)
  }, [])

  const checkCurrentSession = async () => {
    try {
      const data = await authApi.getMe()
      if (data.authenticated && data.user) {
        const user = normalizeUser(data.user, data.user.username ? 'admin' : data.user.college_name ? 'college' : 'teacher')
        setCurrentUser(user)
        if (user.role === 'admin') setView('admin-dashboard')
        else if (user.role === 'college') setView('college-dashboard')
        else if (user.role === 'teacher') setView(user.force_password_reset ? 'teacher-reset-password' : 'teacher-dashboard')
      } else {
        setView('landing')
      }
    } catch {
      setView('landing')
    } finally {
      setInitializing(false)
    }
  }

  useEffect(() => {
    checkCurrentSession()
  }, [])

  useEffect(() => {
    const handleAuthExpired = () => {
      if (!currentUserRef.current) return
      setCurrentUser(null)
      setView('role-selector')
      showToast('Your session has expired. Please log in again.', 'error')
    }

    window.addEventListener('auth-expired', handleAuthExpired)
    return () => window.removeEventListener('auth-expired', handleAuthExpired)
  }, [showToast])

  const handleLoginSuccess = (user) => {
    const normalizedUser = normalizeUser(user, user?.username ? 'admin' : user?.college_name ? 'college' : 'teacher')
    setCurrentUser(normalizedUser)
    showToast(`Welcome back, ${normalizedUser.username || normalizedUser.name || normalizedUser.college_name || 'User'}!`, 'success')
    if (normalizedUser.role === 'admin') setView('admin-dashboard')
    else if (normalizedUser.role === 'college') setView('college-dashboard')
    else if (normalizedUser.role === 'teacher') setView(normalizedUser.force_password_reset ? 'teacher-reset-password' : 'teacher-dashboard')
  }

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch (e) {
      console.error(e)
    }
    setCurrentUser(null)
    setView('landing')
    showToast('You have been signed out.', 'success')
  }

  const handleSeedDemoData = async () => {
    try {
      const res = await authApi.seedDemo()
      showToast(res.message, 'success')
    } catch (err) {
      showToast(err.message || 'Failed to seed demo data.', 'error')
    }
  }

  if (initializing) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading EduCore SMS Portal...</p>
      </div>
    )
  }

  return (
    <div className="educore-root">
      {/* Floating Toast Notification */}
      {toast && (
        <div className={`educore-toast toast-${toast.type}`}>
          <span className="toast-icon">{toast.type === 'success' ? '✓' : '⚠️'}</span>
          <div className="toast-msg">{toast.message}</div>
          <button className="toast-close-btn" onClick={() => setToast(null)}>
            &times;
          </button>
        </div>
      )}

      {/* 1. PUBLIC LANDING PAGE (Screenshot 1) */}
      {view === 'landing' && (
        <LandingPage
          onGoToRoleSelector={() => setView('role-selector')}
          onGoToCollegeRegister={() => setView('college-register')}
          onSeedDemo={handleSeedDemoData}
        />
      )}

      {/* 2. ROLE SELECTOR (Screenshot 2: Welcome Back) */}
      {view === 'role-selector' && (
        <div className="portal-page-shell">
          <RoleSelector
            onSelectRole={(targetView) => setView(targetView)}
            onBackToLanding={() => setView('landing')}
          />
        </div>
      )}

      {/* 3. AUTH LOGINS & REGISTRATION */}
      {view === 'admin-login' && (
        <div className="portal-page-shell">
          <AdminLoginForm
            onLoginSuccess={handleLoginSuccess}
            onBack={() => setView('role-selector')}
          />
        </div>
      )}

      {view === 'college-login' && (
        <div className="portal-page-shell">
          <CollegeLoginForm
            onLoginSuccess={handleLoginSuccess}
            onGoToRegister={() => setView('college-register')}
            onBack={() => setView('role-selector')}
          />
        </div>
      )}

      {view === 'college-register' && (
        <div className="portal-page-shell">
          <CollegeRegisterForm
            onRegisterSuccess={(msg) => {
              showToast(msg, 'success')
              setView('college-login')
            }}
            onGoToLogin={() => setView('college-login')}
            onBack={() => setView('landing')}
          />
        </div>
      )}

      {view === 'teacher-login' && (
        <div className="portal-page-shell">
          <TeacherLoginForm
            onLoginSuccess={handleLoginSuccess}
            onBack={() => setView('role-selector')}
          />
        </div>
      )}

      {view === 'teacher-reset-password' && (
        <ResetTeacherPassword
          onComplete={(user, message) => {
            setCurrentUser(normalizeUser(user, 'teacher'))
            showToast(message, 'success')
            setView('teacher-dashboard')
          }}
          onLogout={handleLogout}
        />
      )}

      {/* 4. DASHBOARDS */}
      {view === 'admin-dashboard' && (
        <AdminDashboard
          adminUser={currentUser}
          onShowToast={showToast}
          onLogout={handleLogout}
          onBackToHome={() => setView('landing')}
        />
      )}

      {view === 'college-dashboard' && (
        <CollegeDashboard
          collegeUser={currentUser}
          onShowToast={showToast}
          onLogout={handleLogout}
          onBackToHome={() => setView('landing')}
        />
      )}

      {view === 'teacher-dashboard' && (
        <TeacherDashboard
          teacherUser={currentUser}
          onShowToast={showToast}
          onLogout={handleLogout}
          onBackToHome={() => setView('landing')}
        />
      )}
    </div>
  )
}

export default App
