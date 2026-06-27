const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const token = localStorage.getItem("spaceece_auth_token");
  
  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

// Auth APIs
export function loginUser(credentials) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function registerTeacher(payload) {
  return request("/api/auth/register-teacher", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getStoredSession() {
  const token = localStorage.getItem("spaceece_auth_token");
  const rawUser = localStorage.getItem("spaceece_user");

  if (!token || !rawUser) return null;

  try {
    return { token, user: JSON.parse(rawUser) };
  } catch {
    localStorage.removeItem("spaceece_auth_token");
    localStorage.removeItem("spaceece_user");
    return null;
  }
}

export function storeSession({ token, user }) {
  localStorage.setItem("spaceece_auth_token", token);
  localStorage.setItem("spaceece_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("spaceece_auth_token");
  localStorage.removeItem("spaceece_user");
}

// File Upload API
export function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  return request("/api/upload", {
    method: "POST",
    body: formData
  });
}

// Center Management APIs
export function getCenters() {
  return request("/api/centers");
}

export function createCenter(centerData) {
  return request("/api/centers", {
    method: "POST",
    body: JSON.stringify(centerData)
  });
}

export function updateCenter(id, centerData) {
  return request(`/api/centers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(centerData)
  });
}

export function deleteCenter(id) {
  return request(`/api/centers/${id}`, {
    method: "DELETE"
  });
}

// Class Management APIs
export function getClasses(centerId = "") {
  const path = centerId ? `/api/admin/classes?centerId=${centerId}` : "/api/admin/classes";
  return request(path);
}

export function createClass(classData) {
  return request("/api/admin/classes", {
    method: "POST",
    body: JSON.stringify(classData)
  });
}

export function updateClass(id, classData) {
  return request(`/api/admin/classes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(classData)
  });
}

export function deleteClass(id) {
  return request(`/api/admin/classes/${id}`, {
    method: "DELETE"
  });
}

// Children Management APIs
export function getChildren(params = {}) {
  const searchParams = new URLSearchParams(params);
  return request(`/api/admin/children?${searchParams.toString()}`);
}

export function getTeacherChildren() {
  return request("/api/teacher/children");
}

export function createTeacherChild(childData) {
  return request("/api/teacher/children", {
    method: "POST",
    body: JSON.stringify(childData)
  });
}

export function createChild(childData) {
  return request("/api/admin/children", {
    method: "POST",
    body: JSON.stringify(childData)
  });
}

export function updateChild(id, childData) {
  return request(`/api/admin/children/${id}`, {
    method: "PATCH",
    body: JSON.stringify(childData)
  });
}

export function deleteChild(id) {
  return request(`/api/admin/children/${id}`, {
    method: "DELETE"
  });
}

// Teacher Management APIs
export function getAdminTeachers() {
  return request("/api/admin/teachers");
}

export function updateTeacherProfile(id, teacherData) {
  return request(`/api/admin/teachers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(teacherData)
  });
}

export function updateTeacherStatus(id, status) {
  return request(`/api/admin/teachers/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function deleteTeacher(id) {
  return request(`/api/admin/teachers/${id}`, {
    method: "DELETE"
  });
}

export function getTeacherMe() {
  return request("/api/teacher/me");
}

export function getTeacherProgress() {
  return request("/api/teacher/progress");
}

export function askTeacherChatbot(message) {
  return request("/api/teacher/chatbot", {
    method: "POST",
    body: JSON.stringify({ message })
  });
}

// Course Management APIs
export function getCourses() {
  return request("/api/courses");
}

export function createCourse(courseData) {
  return request("/api/courses", {
    method: "POST",
    body: JSON.stringify(courseData)
  });
}

export function updateCourse(id, courseData) {
  return request(`/api/courses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(courseData)
  });
}

export function deleteCourse(id) {
  return request(`/api/courses/${id}`, {
    method: "DELETE"
  });
}

export function assignCourse(courseId, payload) {
  return request(`/api/courses/${courseId}/assign`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getCourseAssignments() {
  return request("/api/admin/courses/assignments");
}

export function updateCourseAssignmentReview(assignmentId, payload) {
  return request(`/api/admin/courses/assignments/${assignmentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function updateCourseAssignmentProgress(assignmentId, payload) {
  return request(`/api/teacher/courses/assignments/${assignmentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}


// Lesson Plan APIs
export function getLessonPlans() {
  return request("/api/lesson-plans");
}

export function createLessonPlan(lessonData) {
  return request("/api/lesson-plans", {
    method: "POST",
    body: JSON.stringify(lessonData)
  });
}

export function updateLessonPlan(id, lessonData) {
  return request(`/api/lesson-plans/${id}`, {
    method: "PATCH",
    body: JSON.stringify(lessonData)
  });
}

export function deleteLessonPlan(id) {
  return request(`/api/lesson-plans/${id}`, {
    method: "DELETE"
  });
}

export function assignLessonPlan(payload) {
  return request("/api/lesson-plans/assign", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getAdminLessonAssignments() {
  return request("/api/admin/lesson-plans/assignments");
}

export function updateLessonPlanAssignment(id, payload) {
  return request(`/api/admin/lesson-plans/assignments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function getTeacherLessonPlans() {
  return request("/api/teacher/lesson-plans");
}


export function submitLessonCompletion(assignmentId, payload) {
  return request(`/api/teacher/lesson-plans/${assignmentId}/complete`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getAdminLessonReports() {
  return request("/api/admin/lesson-plans/reports");
}

export function reviewLessonReport(reportId, payload) {
  return request(`/api/admin/lesson-plans/reports/${reportId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

// Activity APIs
export function getActivities() {
  return request("/api/activities");
}

export function submitActivity(activityData) {
  return request("/api/activities", {
    method: "POST",
    body: JSON.stringify(activityData)
  });
}

export function reviewActivity(id, reviewData) {
  return request(`/api/activities/${id}`, {
    method: "PATCH",
    body: JSON.stringify(reviewData)
  });
}

// Attendance APIs
export function getChildAttendance(params = {}) {
  const searchParams = new URLSearchParams(params);
  return request(`/api/attendance/children?${searchParams.toString()}`);
}

export function saveChildAttendance(payload) {
  return request("/api/attendance/children", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getTeacherAttendance(params = {}) {
  const searchParams = new URLSearchParams(params);
  return request(`/api/attendance/teachers?${searchParams.toString()}`);
}

export function saveTeacherAttendance(payload) {
  return request("/api/attendance/teachers", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

// Trainer APIs
export function getTrainers() {
  return request("/api/trainers");
}

export function createTrainer(trainerData) {
  return request("/api/trainers", {
    method: "POST",
    body: JSON.stringify(trainerData)
  });
}

export function updateTrainer(id, trainerData) {
  return request(`/api/trainers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(trainerData)
  });
}

export function deleteTrainer(id) {
  return request(`/api/trainers/${id}`, {
    method: "DELETE"
  });
}

// Feedback APIs
export function getFeedbacks() {
  return request("/api/feedbacks");
}

export function submitFeedback(feedbackData) {
  return request("/api/feedbacks", {
    method: "POST",
    body: JSON.stringify(feedbackData)
  });
}

export function updateFeedback(id, feedbackData) {
  return request(`/api/feedbacks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(feedbackData)
  });
}

// Notifications APIs
export function getNotifications() {
  return request("/api/notifications");
}

export function markNotificationRead(id) {
  return request(`/api/notifications/${id}/read`, {
    method: "PATCH"
  });
}

// Reports/Analytics API
export function getAdminAnalytics() {
  return request("/api/admin/reports/analytics");
}

export function getReportJobs() {
  return request("/api/admin/report-jobs");
}

export function createReportJob(reportData) {
  return request("/api/admin/report-jobs", {
    method: "POST",
    body: JSON.stringify(reportData)
  });
}

export function updateReportJob(id, reportData) {
  return request(`/api/admin/report-jobs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(reportData)
  });
}
