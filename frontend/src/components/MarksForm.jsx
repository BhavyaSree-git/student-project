import { useMemo, useState } from 'react'

export default function MarksForm({ initialSubjects = [], onSave, onCancel, saving = false }) {
  const [subjects, setSubjects] = useState(
    initialSubjects.length > 0
      ? initialSubjects
      : [
          { subject: 'Mathematics', marks: '' },
          { subject: 'Physics', marks: '' },
          { subject: 'Chemistry', marks: '' },
          { subject: 'English', marks: '' },
        ]
  )

  const handleSubjectChange = (index, field, value) => {
    const next = [...subjects]
    next[index][field] = value
    setSubjects(next)
  }

  const addSubjectRow = () => {
    setSubjects([...subjects, { subject: '', marks: '' }])
  }

  const removeSubjectRow = (index) => {
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

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = subjects
      .filter((s) => s.subject.trim() !== '' && s.marks !== '')
      .map((s) => ({
        subject: s.subject.trim(),
        marks: parseFloat(s.marks),
      }))

    if (onSave) onSave(payload)
  }

  return (
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
        {onCancel && (
          <button className="secondary-button" type="button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
