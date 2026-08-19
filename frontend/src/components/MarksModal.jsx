import { useCallback, useEffect, useMemo, useState } from 'react'
import { teacherApi } from '../services/api'
import Modal from './Modal'

export default function MarksModal({ student, isOpen, onClose, onMarksSaved }) {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadMarks = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await teacherApi.getStudentMarks(student.id)
      if (data.marks && data.marks.length > 0) {
        setSubjects(data.marks.map((m) => ({ id: m.id, subject: m.subject, marks: m.marks })))
      } else {
        // Default standard subject template
        setSubjects([
          { subject: 'Mathematics', marks: '' },
          { subject: 'Physics', marks: '' },
          { subject: 'Chemistry', marks: '' },
          { subject: 'English', marks: '' },
        ])
      }
    } catch (err) {
      setError(err.message || 'Failed to load marks.')
    } finally {
      setLoading(false)
    }
  }, [student])

  useEffect(() => {
    if (student && isOpen) {
      loadMarks()
    }
  }, [student, isOpen, loadMarks])

  const handleSubjectChange = (index, field, value) => {
    const next = [...subjects]
    next[index][field] = value
    setSubjects(next)
  }

  const addSubjectRow = () => {
    setSubjects([...subjects, { subject: '', marks: '' }])
  }

  const removeSubjectRow = async (index) => {
    const item = subjects[index]
    if (item.id) {
      try {
        await teacherApi.deleteMark(item.id)
      } catch (e) {
        console.error(e)
      }
    }
    setSubjects(subjects.filter((_, i) => i !== index))
  }

  const stats = useMemo(() => {
    const validScores = subjects
      .map((s) => parseFloat(s.marks))
      .filter((val) => !isNaN(val) && val >= 0 && val <= 100)

    if (validScores.length === 0) {
      return { total: 0, count: 0, average: 0, percentage: 0 }
    }
    const total = validScores.reduce((acc, curr) => acc + curr, 0)
    const average = total / validScores.length
    return {
      total: Math.round(total * 100) / 100,
      count: validScores.length,
      average: Math.round(average * 100) / 100,
      percentage: Math.round(average * 100) / 100,
    }
  }, [subjects])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = subjects
      .filter((s) => s.subject.trim() !== '' && s.marks !== '')
      .map((s) => ({
        subject: s.subject.trim(),
        marks: parseFloat(s.marks),
      }))

    if (payload.length === 0) {
      setError('Please add at least one valid subject and mark.')
      setSaving(false)
      return
    }

    try {
      await teacherApi.saveStudentMarks(student.id, { subjects: payload })
      onMarksSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save marks.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Manage Academic Marks: ${student?.name || ''} (${student?.student_id || ''})`}
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="600px"
    >
      {error && <div className="toast error">{error}</div>}

      {loading ? (
        <p>Loading marks data...</p>
      ) : (
        <form onSubmit={handleSubmit} className="stack-form">
          <div className="marks-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject Name</th>
                  <th style={{ width: '130px' }}>Marks (0-100)</th>
                  <th style={{ width: '60px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        type="text"
                        placeholder="e.g. Mathematics"
                        value={item.subject}
                        onChange={(e) => handleSubjectChange(idx, 'subject', e.target.value)}
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        placeholder="0-100"
                        min="0"
                        max="100"
                        step="0.1"
                        value={item.marks}
                        onChange={(e) => handleSubjectChange(idx, 'marks', e.target.value)}
                        required
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="delete-row-btn"
                        onClick={() => removeSubjectRow(idx)}
                        title="Remove Subject"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="button" className="secondary-button add-row-btn" onClick={addSubjectRow}>
            + Add Subject
          </button>

          <div className="calc-summary-card">
            <div className="calc-item">
              <span>Total Subjects</span>
              <strong>{stats.count}</strong>
            </div>
            <div className="calc-item">
              <span>Total Marks</span>
              <strong>{stats.total}</strong>
            </div>
            <div className="calc-item">
              <span>Average Marks</span>
              <strong>{stats.average}%</strong>
            </div>
            <div className="calc-item highlight">
              <span>Overall Percentage</span>
              <strong>{stats.percentage}%</strong>
            </div>
          </div>

          <div className="button-row" style={{ marginTop: '16px' }}>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? 'Saving Marks...' : 'Save Marks'}
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
