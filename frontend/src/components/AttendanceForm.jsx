import { useMemo, useState } from 'react'

export default function AttendanceForm({
  initialTotal = 0,
  initialPresent = 0,
  onSave,
  onCancel,
  saving = false,
}) {
  const [totalClasses, setTotalClasses] = useState(initialTotal)
  const [present, setPresent] = useState(initialPresent)

  const { absent, percentage, statusClass } = useMemo(() => {
    const total = parseInt(totalClasses, 10) || 0
    const pres = parseInt(present, 10) || 0
    const abs = Math.max(0, total - pres)
    const pct = total > 0 ? Math.round((pres / total) * 100 * 100) / 100 : 0
    let cls = 'good'
    if (pct < 75) cls = 'warning'
    if (pct < 60) cls = 'danger'
    return { absent: abs, percentage: pct, statusClass: cls }
  }, [totalClasses, present])

  const handleSubmit = (e) => {
    e.preventDefault()
    const total = parseInt(totalClasses, 10)
    const pres = parseInt(present, 10)
    if (onSave) onSave({ total_classes: total, present: pres })
  }

  return (
    <form onSubmit={handleSubmit} className="stack-form">
      <div className="two-column">
        <div>
          <label className="form-label">Total Classes Held</label>
          <input
            type="number"
            min="0"
            value={totalClasses}
            onChange={(e) => setTotalClasses(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="form-label">Classes Present</label>
          <input
            type="number"
            min="0"
            max={totalClasses || 0}
            value={present}
            onChange={(e) => setPresent(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="calc-summary-card">
        <div className="calc-item">
          <span>Total Classes</span>
          <strong>{totalClasses || 0}</strong>
        </div>
        <div className="calc-item">
          <span>Present</span>
          <strong style={{ color: '#16a34a' }}>{present || 0}</strong>
        </div>
        <div className="calc-item">
          <span>Absent</span>
          <strong style={{ color: '#dc2626' }}>{absent}</strong>
        </div>
        <div className={`calc-item highlight ${statusClass}`}>
          <span>Attendance %</span>
          <strong>{percentage}%</strong>
        </div>
      </div>

      <div className="progress-bar-container">
        <div
          className={`progress-fill progress-${statusClass}`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>

      <div className="button-row" style={{ marginTop: '16px' }}>
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Update Attendance'}
        </button>
        {onCancel && (
          <button className="secondary-button" type="button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
