# Spaceece Teacher Training Portal - Backend API Endpoints

This document describes the REST API endpoints provided by the backend server (`http://localhost:5000`).

## Base URL
```text
http://localhost:5000
```
All request payloads must be in JSON format unless uploading files (`multipart/form-data`).

## Authentication & Headers
Protected endpoints require a JWT token passed in the `Authorization` header:
```http
Authorization: Bearer <your_jwt_token>
```

---

## 🔐 Authentication APIs

### 1. User Login
- **Endpoint**: `POST /api/auth/login`
- **Payload**:
  ```json
  {
    "email": "admin@spaceece.com",
    "password": "Admin@123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "64bf...",
      "role": "admin",
      "name": "Admin User",
      "email": "admin@spaceece.com",
      "status": "approved"
    }
  }
  ```

### 2. Teacher Self-Registration
- **Endpoint**: `POST /api/auth/register-teacher`
- **Payload**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@school.edu",
    "phone": "9876543210",
    "password": "TeacherPassword@123",
    "qualification": "B.Ed",
    "subject": "Pre-Primary Math",
    "experience": "2 years",
    "address": "Delhi, India"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "Registration submitted successfully. Pending Admin Approval.",
    "user": {
      "id": "64c0...",
      "role": "teacher",
      "name": "Jane Doe",
      "email": "jane@school.edu",
      "status": "pending"
    }
  }
  ```

---

## 🏫 Center Management APIs (Admin)

### 1. List Centers
- **Endpoint**: `GET /api/centers` (Requires Auth)
- **Response**: Array of Centers.

### 2. Create Center
- **Endpoint**: `POST /api/centers` (Requires Admin Auth)
- **Payload**:
  ```json
  {
    "name": "Spacece Delhi Center",
    "address": "Connaught Place",
    "city": "Delhi",
    "pincode": "110001",
    "contactPerson": "Manager Name",
    "phone": "9000000003",
    "email": "delhi@spaceece.in"
  }
  ```

### 3. Update Center
- **Endpoint**: `PATCH /api/centers/:id` (Requires Admin Auth)

### 4. Delete Center
- **Endpoint**: `DELETE /api/centers/:id` (Requires Admin Auth)

---

## 🎒 Class & Classroom APIs (Admin)

### 1. List Classrooms
- **Endpoint**: `GET /api/admin/classes` (Requires Admin Auth)
- **Query Parameter**: `centerId` (Optional)

### 2. Create Classroom
- **Endpoint**: `POST /api/admin/classes` (Requires Admin Auth)
- **Payload**:
  ```json
  {
    "center": "64bf... (Center ID)",
    "name": "Classroom B",
    "ageGroup": "4-5 years",
    "curriculumLevel": "Intermediate",
    "schedule": "Mon-Fri 10:00 AM to 1:00 PM"
  }
  ```

---

## 👶 Children Management APIs

### 1. List Children (Admin)
- **Endpoint**: `GET /api/admin/children` (Requires Admin Auth)
- **Query Parameters**: `classId`, `centerId`, `search` (Optional)

### 2. List Classroom Children (Teacher)
- **Endpoint**: `GET /api/teacher/children` (Requires Teacher Auth)
- **Response**: Array of children enrolled in the authenticated teacher's assigned classroom.

### 3. Add Child (Teacher or Admin)
- **Endpoints**: `POST /api/teacher/children` or `POST /api/admin/children`
- **Payload**:
  ```json
  {
    "center": "64bf... (Center ID)",
    "class": "64c1... (Class ID)",
    "fullName": "Aryan Roy",
    "rollNo": "N-B-001",
    "guardianName": "Sumit Roy",
    "guardianPhone": "9000000004"
  }
  ```

---

## 👩 Teacher Management APIs (Admin)

### 1. List Teachers
- **Endpoint**: `GET /api/admin/teachers` (Requires Admin Auth)

### 2. Update Teacher Approval Status
- **Endpoint**: `PATCH /api/admin/teachers/:id/status` (Requires Admin Auth)
- **Payload**:
  ```json
  {
    "status": "approved" // or "pending", "suspended"
  }
  ```

---

## 📚 Course & Curriculum APIs

### 1. List Courses
- **Endpoint**: `GET /api/courses` (Requires Auth)

### 2. Create Course
- **Endpoint**: `POST /api/courses` (Requires Admin Auth)
- **Payload**: Includes modules, content lists (videos, PDFs, links).

### 3. Assign Course to Teacher
- **Endpoint**: `POST /api/courses/:courseId/assign` (Requires Admin Auth)
- **Payload**:
  ```json
  {
    "teacher": "64c0... (Teacher ID)"
  }
  ```

### 4. Update Course Assignment Progress (Teacher)
- **Endpoint**: `PATCH /api/teacher/courses/assignments/:id` (Requires Teacher Auth)
- **Payload**:
  ```json
  {
    "progressPercent": 60,
    "status": "in_progress" // or "completed"
  }
  ```

### 5. Grade & Review Course Progress (Admin)
- **Endpoint**: `PATCH /api/admin/courses/assignments/:id` (Requires Admin Auth)
- **Payload**:
  ```json
  {
    "score": 90,
    "feedback": "Excellent performance on modules",
    "status": "completed"
  }
  ```

---

## 📋 Lesson Plan Delivery APIs

### 1. Create Lesson Plan
- **Endpoint**: `POST /api/lesson-plans` (Requires Admin Auth)

### 2. Assign Lesson Plan to Teacher
- **Endpoint**: `POST /api/lesson-plans/assign` (Requires Admin Auth)
- **Payload**:
  ```json
  {
    "lessonPlan": "64c3... (Lesson Plan ID)",
    "teacher": "64c0... (Teacher ID)",
    "assignedDate": "2026-06-15"
  }
  ```

### 3. Get Teacher's Assigned Lessons
- **Endpoint**: `GET /api/teacher/lesson-plans` (Requires Teacher Auth)

### 4. Review / Complete Lesson Plan Delivery (Teacher/Admin)
- **Endpoint**: `PATCH /api/admin/lesson-plans/assignments/:id` (Requires Auth)
- **Payload**:
  ```json
  {
    "status": "completed",
    "notes": "Lesson delivered successfully using blocks.",
    "evidenceUrl": "/uploads/evidence-123.jpg"
  }
  ```

---

## 🤖 Chatbot API (Teacher)

### 1. Ask Teacher Training Assistant
- **Endpoint**: `POST /api/teacher/chatbot` (Requires Teacher Auth)
- **Payload**:
  ```json
  {
    "message": "What are my pending lessons?"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "reply": "You have 1 pending lesson plan. Open Training & Lessons to view, complete, add notes, and upload evidence."
  }
  ```
- **Intent Keyword Matching**:
  - `attendance`: Recommends daily classroom & geotag teacher attendance.
  - `lesson`, `plan`: Returns the count of pending lesson plans.
  - `course`, `training`: Returns the count of assigned courses.
  - `activity`, `upload`: Returns the count of activity submissions pending review.
  - `center`, `class`: Returns assigned center and classroom name.
  - `notification`, `alert`: Returns count of unread notifications.
  - `profile`, `phone`, `qualification`: Directs teacher to "My Profile" tab.

---

## 📤 File Upload API

### 1. Upload File / Evidence Asset
- **Endpoint**: `POST /api/upload` (Requires Auth)
- **Body**: `multipart/form-data` with field key `file`
- **Response (200 OK)**:
  ```json
  {
    "url": "/uploads/1718456789-file.jpg",
    "assetId": "64c4..."
  }
  ```
