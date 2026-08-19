// In a browser, localhost means the visitor's own device. Use the page hostname so
// the frontend also works when accessed through a server IP or domain.
const API_BASE = import.meta.env.VITE_API_BASE || (
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:5000/api`
    : 'http://localhost:5000/api'
)

function extractErrorMessage(body, status) {
  if (body && typeof body === 'object') {
    return body.error || body.message || `Request failed (${status}).`
  }

  if (typeof body === 'string') {
    const looksLikeHtml = /<!DOCTYPE|<html/i.test(body)
    if (looksLikeHtml) {
      if (status === 404) {
        return 'API endpoint not found. Make sure the backend is running on port 5000.'
      }
      if (status >= 500) {
        return 'Server error. Please check the backend terminal for details.'
      }
      return `Request failed (${status}). The server returned an HTML page instead of JSON.`
    }
    return body.slice(0, 240)
  }

  return `Request failed (${status}).`
}

export async function fetchApi(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  let response
  try {
    response = await fetch(url, {
      credentials: 'include',
      ...options,
      headers,
    })
  } catch {
    throw new Error('Cannot reach the backend. Start Flask on http://localhost:5000 and try again.')
  }

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const errorMsg = extractErrorMessage(body, response.status)
    const err = new Error(errorMsg)
    err.status = response.status
    err.data = body

    // Login/register 401 means bad credentials, not an expired session.
    const isCredentialRequest = /\/auth\/(?:admin|college|teacher)\/(?:login|register)|\/auth\/logout|\/seed-demo/i.test(url)
    if (response.status === 401 && !isCredentialRequest && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth-expired', {
        detail: { status: response.status, message: errorMsg },
      }))
    }

    throw err
  }

  return body
}

export const authApi = {
  getMe: () => fetchApi('/auth/me', { method: 'GET' }),
  adminLogin: (data) => fetchApi('/auth/admin/login', { method: 'POST', body: JSON.stringify(data) }),
  collegeRegister: (data) => fetchApi('/auth/college/register', { method: 'POST', body: JSON.stringify(data) }),
  collegeLogin: (data) => fetchApi('/auth/college/login', { method: 'POST', body: JSON.stringify(data) }),
  teacherLogin: (data) => fetchApi('/auth/teacher/login', { method: 'POST', body: JSON.stringify(data) }),
  resetTeacherPassword: (data) => fetchApi('/auth/teacher/reset-password', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => fetchApi('/auth/logout', { method: 'POST' }),
  seedDemo: () => fetchApi('/seed-demo', { method: 'POST' }),
}

export const adminApi = {
  getDashboard: () => fetchApi('/admin/dashboard', { method: 'GET' }),
  getColleges: () => fetchApi('/admin/colleges', { method: 'GET' }),
  getCollegeTeachers: (collegeId) => fetchApi(`/admin/colleges/${collegeId}/teachers`, { method: 'GET' }),
  approveCollege: (id) => fetchApi(`/admin/colleges/${id}/approve`, { method: 'POST' }),
  rejectCollege: (id, reason) => fetchApi(`/admin/colleges/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  activateCollege: (id) => fetchApi(`/admin/colleges/${id}/activate`, { method: 'POST' }),
  deactivateCollege: (id, reason) => fetchApi(`/admin/colleges/${id}/deactivate`, { method: 'POST', body: JSON.stringify({ reason }) }),
}

export const collegeApi = {
  getProfile: () => fetchApi('/college/profile', { method: 'GET' }),
  getDepartments: () => fetchApi('/college/departments', { method: 'GET' }),
  createDepartment: (data) => fetchApi('/college/departments', { method: 'POST', body: JSON.stringify(data) }),
  getSubjects: () => fetchApi('/college/subjects', { method: 'GET' }),
  createSubject: (data) => fetchApi('/college/subjects', { method: 'POST', body: JSON.stringify(data) }),
  getTeachers: () => fetchApi('/college/teachers', { method: 'GET' }),
  createTeacher: (data) => fetchApi('/college/teachers', { method: 'POST', body: JSON.stringify(data) }),
  deleteTeacher: (id) => fetchApi(`/college/teachers/${id}`, { method: 'DELETE' }),
  getAllStudents: () => fetchApi('/college/students', { method: 'GET' }),
}

export const teacherApi = {
  getProfile: () => fetchApi('/teacher/profile', { method: 'GET' }),
  getDashboard: () => fetchApi('/teacher/dashboard', { method: 'GET' }),
  getStudents: (search = '') => fetchApi(`/students${search ? `?search=${encodeURIComponent(search)}` : ''}`, { method: 'GET' }),
  getStudentDetails: (id) => fetchApi(`/students/${id}`, { method: 'GET' }),
  createStudent: (data) => fetchApi('/students', { method: 'POST', body: JSON.stringify(data) }),
  updateStudent: (id, data) => fetchApi(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStudent: (id) => fetchApi(`/students/${id}`, { method: 'DELETE' }),
  getStudentMarks: (id) => fetchApi(`/students/${id}/marks`, { method: 'GET' }),
  saveStudentMarks: (id, data) => fetchApi(`/students/${id}/marks`, { method: 'POST', body: JSON.stringify(data) }),
  deleteMark: (markId) => fetchApi(`/marks/${markId}`, { method: 'DELETE' }),
  getStudentAttendance: (id) => fetchApi(`/students/${id}/attendance`, { method: 'GET' }),
  saveStudentAttendance: (id, data) => fetchApi(`/students/${id}/attendance`, { method: 'POST', body: JSON.stringify(data) }),
  getAiSummary: () => fetchApi('/ai/summary', { method: 'GET' }),
}
