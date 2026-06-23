const API_BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export const loginAdmin = (data) => request('/auth/admin/login', { method: 'POST', body: JSON.stringify(data) });
export const loginTeacher = (data) => request('/auth/teacher/login', { method: 'POST', body: JSON.stringify(data) });

export const fetchChildren = () => request('/children');
export const fetchChildById = (id) => request(`/children/${id}`);
export const createChild = (data) => request('/children', { method: 'POST', body: JSON.stringify(data) });
export const updateChild = (id, data) => request(`/children/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteChild = (id) => request(`/children/${id}`, { method: 'DELETE' });

export const fetchCenters = () => request('/centers');
export const fetchCourses = () => request('/courses');
export const fetchActivities = () => request('/activities');
export const fetchTeachers = () => request('/teachers');
export const fetchTrainings = () => request('/trainings');
export const fetchAssessments = () => request('/assessments');
export const fetchAnnouncements = () => request('/announcements');