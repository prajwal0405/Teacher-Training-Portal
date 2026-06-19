# Teacher Dashboard Backend API Documentation

## Overview
This backend provides REST APIs for the Teacher Training Portal Dashboard. It uses MongoDB for data storage and Express.js for the server.

## Database Models

### 1. **Teacher**
Stores teacher profile information.
```
- name: String (required)
- email: String (required, unique)
- phone: String
- address: String
- subject: String
- password: String (required)
- joined: String
- status: String (approved, pending, rejected)
- attendance: Number
- workingCenter: String
- degree: String
- university: String
- netStatus: String
- expYears: String
```

### 2. **Course**
Represents courses/training programs taught by a teacher.
```
- teacherId: ObjectId (required, ref: Teacher)
- name: String (required)
- description: String
- duration: String
- modules: Number
- completedModules: Number
- students: Number
- progress: Number (0-100)
- status: String (ongoing, completed, pending)
- nextDate: Date
```

### 3. **Student**
Stores student information.
```
- teacherId: ObjectId (required, ref: Teacher)
- name: String (required)
- email: String
- phone: String
- grade: String
- status: String (active, inactive, suspended)
- enrollmentDate: Date
- totalClasses: Number
- attendedClasses: Number
- averageGrade: Number
```

### 4. **Class**
Represents individual class sessions.
```
- teacherId: ObjectId (required, ref: Teacher)
- courseId: ObjectId (ref: Course)
- name: String (required)
- description: String
- classDate: Date (required)
- startTime: String (HH:MM)
- endTime: String (HH:MM)
- room: String
- status: String (scheduled, ongoing, completed, cancelled)
- students: [ObjectId] (ref: Student)
- totalStudents: Number
- attendedStudents: Number
```

### 5. **Attendance**
Tracks attendance records.
```
- teacherId: ObjectId (required, ref: Teacher)
- studentId: ObjectId (ref: Student)
- classId: ObjectId (ref: Class)
- date: Date (required)
- status: String (present, absent, late, excused)
- remarks: String
```

### 6. **Grade**
Stores student grades and assessments.
```
- teacherId: ObjectId (required, ref: Teacher)
- studentId: ObjectId (required, ref: Student)
- courseId: ObjectId (ref: Course)
- assessmentName: String (required)
- score: Number (required)
- maxScore: Number
- percentage: Number
- grade: String (A, B, C, D, F)
- feedback: String
- dateGraded: Date
```

### 7. **Certificate**
Manages student certificates.
```
- teacherId: ObjectId (required, ref: Teacher)
- studentId: ObjectId (required, ref: Student)
- courseId: ObjectId (ref: Course)
- certificateId: String (unique)
- title: String (required)
- issueDate: Date
- expiryDate: Date
- status: String (issued, pending, revoked)
- certificateUrl: String
```

### 8. **Assignment**
Stores assignment information.
```
- teacherId: ObjectId (required, ref: Teacher)
- courseId: ObjectId (ref: Course)
- title: String (required)
- description: String
- dueDate: Date (required)
- status: String (pending, active, completed, revision)
- totalMarks: Number
- submittedCount: Number
- totalStudents: Number
```

### 9. **Task**
Tracks teacher's tasks and to-do items.
```
- teacherId: ObjectId (required, ref: Teacher)
- title: String (required)
- description: String
- dueDate: Date (required)
- priority: String (low, medium, high)
- status: String (pending, in-progress, completed)
- category: String (grading, lesson-planning, assessment)
```

### 10. **MonthlyAttendance**
Tracks monthly attendance statistics.
```
- teacherId: ObjectId (required, ref: Teacher)
- month: Number (1-12, required)
- year: Number (required)
- attendancePercentage: Number
- totalClasses: Number
- classesAttended: Number
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new teacher
- `POST /api/auth/login` - Login teacher
- `GET /api/profile/:email` - Get teacher profile
- `PUT /api/profile/:email` - Update teacher profile
- `PUT /api/profile/:email/password` - Change password

### Dashboard
- `GET /api/dashboard/summary/:teacherId` - Get dashboard summary (classes, students, attendance, avg grade, certificates, tasks)
- `GET /api/dashboard/monthly-attendance/:teacherId` - Get monthly attendance chart data
- `GET /api/dashboard/course-progress/:teacherId` - Get course progress
- `GET /api/dashboard/todays-classes/:teacherId` - Get today's classes
- `GET /api/dashboard/assignments/:teacherId` - Get assignment status

### Courses
- `POST /api/courses` - Create a new course
- `GET /api/courses/:teacherId` - Get all courses for a teacher
- `PUT /api/courses/:courseId` - Update course (progress, status, etc.)

### Students
- `POST /api/students` - Add a new student
- `GET /api/students/:teacherId` - Get all students for a teacher

### Classes
- `POST /api/classes` - Create a new class
- `GET /api/classes/:teacherId` - Get all classes for a teacher

### Attendance
- `POST /api/attendance` - Record attendance
- `GET /api/attendance/:teacherId` - Get attendance records

### Grades
- `POST /api/grades` - Add a grade
- `GET /api/grades/:teacherId` - Get all grades

### Certificates
- `POST /api/certificates` - Issue a certificate
- `GET /api/certificates/:teacherId` - Get all certificates

### Assignments
- `POST /api/assignments` - Create an assignment
- `GET /api/assignments/:teacherId` - Get all assignments
- `PUT /api/assignments/:assignmentId` - Update assignment

### Tasks
- `POST /api/tasks` - Create a task
- `GET /api/tasks/:teacherId` - Get all tasks
- `PUT /api/tasks/:taskId` - Update task (mark complete, etc.)

### Monthly Attendance
- `POST /api/monthly-attendance` - Record monthly attendance
- `GET /api/monthly-attendance/:teacherId` - Get monthly attendance records

## Example Requests

### Register Teacher
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "Sannidhya",
  "email": "sannidhya@spacece.com",
  "phone": "9876543210",
  "address": "Pune, Maharashtra",
  "subject": "History",
  "password": "password123"
}
```

### Create Course
```bash
POST /api/courses
Content-Type: application/json

{
  "teacherId": "teacher_id_here",
  "name": "Pre-Primary Teacher Training",
  "description": "Training for pre-primary teachers",
  "duration": "4 weeks",
  "modules": 24,
  "completedModules": 17,
  "progress": 72,
  "status": "ongoing"
}
```

### Get Dashboard Summary
```bash
GET /api/dashboard/summary/teacher_id_here
```

Response:
```json
{
  "myClasses": 6,
  "totalStudents": 230,
  "attendance": 90,
  "avgGrade": 82,
  "certificates": 2,
  "pendingTasks": 2
}
```

### Record Attendance
```bash
POST /api/attendance
Content-Type: application/json

{
  "teacherId": "teacher_id_here",
  "studentId": "student_id_here",
  "classId": "class_id_here",
  "date": "2026-06-17",
  "status": "present",
  "remarks": "On time"
}
```

### Add Grade
```bash
POST /api/grades
Content-Type: application/json

{
  "teacherId": "teacher_id_here",
  "studentId": "student_id_here",
  "courseId": "course_id_here",
  "assessmentName": "Mid-term Exam",
  "score": 85,
  "maxScore": 100,
  "feedback": "Great performance!"
}
```

## Running the Server

```bash
# Install dependencies
cd backend
npm install

# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server runs on `http://localhost:5001` by default.

## Environment Variables

Create a `.env` file in the backend directory:
```
MONGODB_URI=mongodb://localhost:27017/teacher-training
PORT=5001
```

## Data Flow for Dashboard

1. **Summary Statistics**: Aggregates data from all collections for quick overview
2. **Monthly Attendance**: Queries AttendanceRecords for each month
3. **Course Progress**: Retrieves courses and calculates progress percentage
4. **Today's Classes**: Filters classes by today's date
5. **Assignment Status**: Gets recent assignments sorted by due date
6. **Tasks**: Retrieves pending tasks for the teacher

## Notes

- All APIs require valid teacherId for filtering teacher-specific data
- Dates are stored in ISO 8601 format
- All timestamps include createdAt and updatedAt fields
- Relationship data can be populated using `.populate()` in queries
- Error responses include descriptive error messages
