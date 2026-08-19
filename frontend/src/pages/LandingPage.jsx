export default function LandingPage({ onGoToRoleSelector, onGoToCollegeRegister, onSeedDemo }) {
  return (
    <div className="landing-page-wrapper">
      {/* Top Public Navigation */}
      <nav className="landing-navbar">
        <div className="landing-brand">
          <div className="landing-brand-logo">🏛️</div>
          <span className="landing-brand-name">EduManage SMS</span>
        </div>

        <div className="landing-nav-links">
          <a href="#home" className="active">Home</a>
          <a href="#about">About</a>
          <a href="#features">Features</a>
          <a href="#contact">Contact</a>
        </div>

        <div className="landing-nav-actions">
          {onSeedDemo && (
            <button className="seed-demo-btn" onClick={onSeedDemo} title="Pre-fill sample colleges and students">
              🌱 Demo Data
            </button>
          )}
          <button className="landing-login-btn" onClick={onGoToRoleSelector}>
            Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-dot"></span> New v2.0 Release
          </div>

          <h1 className="hero-headline">
            Smart Student Management for Modern Colleges
          </h1>

          <p className="hero-description">
            A unified platform designed for institutional excellence. Seamlessly manage colleges, teachers, students, marks, and attendance with unparalleled clarity and control.
          </p>

          <div className="hero-cta-group">
            <button className="hero-btn-primary" onClick={onGoToCollegeRegister}>
              College Registration &rarr;
            </button>
            <button className="hero-btn-secondary" onClick={onGoToRoleSelector}>
              Login
            </button>
          </div>

          <div className="hero-social-proof">
            <div className="avatar-group">
              <span className="avatar-circle av-1">JD</span>
              <span className="avatar-circle av-2">NK</span>
              <span className="avatar-circle av-3">AS</span>
            </div>
            <span className="proof-text">Trusted by <strong>500+ Institutions</strong></span>
          </div>
        </div>

        {/* Right Preview Card Mockup */}
        <div className="hero-preview-container">
          <div className="preview-card-mockup">
            <div className="mockup-header-bar">
              <div className="mockup-dots">
                <span className="dot dot-red"></span>
                <span className="dot dot-yellow"></span>
                <span className="dot dot-green"></span>
              </div>
              <div className="mockup-search-placeholder"></div>
            </div>

            <div className="mockup-stats-row">
              <div className="mockup-stat-box">
                <span className="stat-label">Total Students</span>
                <strong className="stat-value">12,450</strong>
              </div>
              <div className="mockup-stat-box">
                <span className="stat-label">Attendance Rate</span>
                <strong className="stat-value highlight-green">94.2%</strong>
              </div>
            </div>

            <div className="mockup-activity-section">
              <span className="section-label">Recent Activity</span>
              <div className="mockup-activity-bars">
                <div className="activity-bar-row">
                  <div className="bar-label"></div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: '85%' }}></div></div>
                </div>
                <div className="activity-bar-row">
                  <div className="bar-label"></div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: '70%' }}></div></div>
                </div>
                <div className="activity-bar-row">
                  <div className="bar-label"></div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: '92%' }}></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section Below */}
      <section className="landing-features-section">
        <div className="features-header">
          <h2>Everything you need to run your institution</h2>
          <p className="features-subtext">
            Our comprehensive suite of tools replaces disconnected systems with one unified, authoritative source of truth.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon icon-navy">🛡️</div>
            <h3>Admin Governance</h3>
            <p>Full oversight over college applications, audit approval/rejections with reasons, and monitor overall capacity.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon icon-teal">🏛️</div>
            <h3>College & Faculty Portals</h3>
            <p>Institution dashboards with secure teacher credential issuance, course tracking, and student directory access.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon icon-purple">🤖</div>
            <h3>1-Click AI Summaries</h3>
            <p>Automated Top 3 performance ranking by marks and attendance with OpenAI-powered natural language insights.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
