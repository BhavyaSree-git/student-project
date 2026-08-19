export default function AISummary({ topStudents, aiSummary, aiEngine = 'OpenAI', onDismiss }) {
  if (!topStudents || topStudents.length === 0) return null

  const medals = ['🥇 Gold Medalist', '🥈 Silver Medalist', '🥉 Bronze Medalist']
  const medalClasses = ['rank-first', 'rank-second', 'rank-third']

  return (
    <div className="panel ai-summary-panel">
      <div className="ai-summary-header">
        <div className="ai-title-wrap">
          <span className="ai-sparkle">✨</span>
          <div>
            <h3>Top 3 Academic Achievers & AI Performance Analysis</h3>
            <p className="subtext">
              Ranked by weighted score (70% Marks + 30% Attendance). Summarized via <strong>{aiEngine}</strong>.
            </p>
          </div>
        </div>
        {onDismiss && (
          <button className="secondary-button" onClick={onDismiss}>
            ✕ Dismiss
          </button>
        )}
      </div>

      <div className="top-podium-grid">
        {topStudents.map((student, idx) => (
          <div key={student.id || idx} className={`podium-card ${medalClasses[idx] || ''}`}>
            <div className="podium-medal">{medals[idx] || `#${idx + 1}`}</div>
            <h4 className="podium-name">{student.name}</h4>
            <p className="podium-subtext">ID: {student.student_id} &bull; {student.course}</p>
            <div className="podium-stats">
              <div className="p-stat">
                <span>Marks</span>
                <strong>{student.marks}%</strong>
              </div>
              <div className="p-stat">
                <span>Attendance</span>
                <strong>{student.attendance}%</strong>
              </div>
              <div className="p-stat highlight">
                <span>Overall</span>
                <strong>{student.overall_score}%</strong>
              </div>
            </div>
          </div>
        ))}
      </div>

      {aiSummary && (
        <div className="ai-narrative-box">
          <div className="ai-narrative-header">
            <strong>🤖 AI Performance Summary & Advice</strong>
          </div>
          <p className="ai-narrative-text">{aiSummary}</p>
        </div>
      )}
    </div>
  )
}
