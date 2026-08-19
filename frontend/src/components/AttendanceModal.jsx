import { useCallback, useEffect, useMemo, useState } from 'react'
import { teacherApi } from '../services/api'
import Modal from './Modal'

export default function AttendanceModal({ student, isOpen, onClose, onAttendanceSaved }) {
  const [totalClasses, setTotalClasses] = useState(0)
  const [present, setPresent] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadAttendance = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await teacherApi.getStudentAttendance(student.id)
      if (data.attendance) {
        setTotalClasses(data.attendance.total_classes || 0)
        setPresent(data.attendance.present || 0)
      }
    } catch (err) {
      setError(err.message || 'Failed to load attendance record.')
    } finally {
      setLoading(false)
    }
  }, [student])

  useEffect(() => {
    if (student && isOpen) {
      loadAttendance()
    }
  }, [student, isOpen, loadAttendance])

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const total = parseInt(totalClasses, 10)
    const pres = parseInt(present, 10)

    if (isNaN(total) || isNaN(pres)) {
      setError('Please provide valid numbers for Total Classes and Present count.')
      setSaving(false)
      return
    }

    if (total < 0 || pres < 0) {
      setError('Values cannot be negative.')
      setSaving(false)
      return
    }

    if (pres > total) {
      setError('Present count cannot exceed Total Classes.')
      setSaving(false)
      return
    }

    try {
      await teacherApi.saveStudentAttendance(student.id, {
        total_classes: total,
        present: pres,
      })
      onAttendanceSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save attendance.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Maintain Attendance: ${student?.name || ''} (${student?.student_id || ''})`}
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="500px"
    >
      {error && <div className="toast error">{error}</div>}

      {loading ? (
        <p>Loading attendance data...</p>
      ) : (
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
            <button className="secondary-button" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
