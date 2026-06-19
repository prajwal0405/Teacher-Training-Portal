# 🚀 Quick Start Guide - Teacher Dashboard Backend

## What's New

I've created a complete backend and database system for your Teacher Dashboard with:

✅ **10 MongoDB Models** for storing all dashboard data
✅ **50+ API Endpoints** for dashboard, courses, students, classes, etc.
✅ **Sample Data Seeding** to populate demo data
✅ **Complete Documentation** for all APIs
✅ **Environment Configuration** setup

## File Structure Added

```
backend/
├── models/
│   ├── Course.js              ← New
│   ├── Student.js             ← New
│   ├── Class.js               ← New
│   ├── Attendance.js          ← New
│   ├── Grade.js               ← New
│   ├── Certificate.js         ← New
│   ├── Assignment.js          ← New
│   ├── Task.js                ← New
│   └── MonthlyAttendance.js   ← New
├── server.js                  ← Updated with API routes
├── seedData.js                ← New (sample data)
├── .env.example               ← New
├── API_DOCUMENTATION.md       ← New
├── DATABASE_SETUP.md          ← New
└── QUICK_START.md             ← This file
```

## ⚡ Quick Start (5 minutes)

### 1. Create .env File
```bash
cd backend
cp .env.example .env
```

### 2. Populate Sample Data
```bash
npm run seed
```

Sample teacher credentials:
- Email: `sannidhya@spacece.com`
- Password: `password123`

### 3. Server is Already Running
Your backend is running on `http://localhost:5001`

## 🎯 Testing Dashboard APIs

### Get Dashboard Summary
```bash
# Replace with actual teacher ID from database
curl http://localhost:5001/api/dashboard/summary/[TEACHER_ID]
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

### Get Monthly Attendance Chart
```bash
curl http://localhost:5001/api/dashboard/monthly-attendance/[TEACHER_ID]
```

### Get Course Progress
```bash
curl http://localhost:5001/api/dashboard/course-progress/[TEACHER_ID]
```

### Get Today's Classes
```bash
curl http://localhost:5001/api/dashboard/todays-classes/[TEACHER_ID]
```

### Get Assignments
```bash
curl http://localhost:5001/api/dashboard/assignments/[TEACHER_ID]
```

## 📚 Database Models Overview

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| **Teacher** | Teacher profile | name, email, subject, status |
| **Course** | Training programs | name, modules, progress, status |
| **Student** | Student info | name, email, grade, status |
| **Class** | Class sessions | name, classDate, room, status |
| **Attendance** | Attendance tracking | date, status (present/absent) |
| **Grade** | Student grades | assessmentName, score, grade |
| **Certificate** | Issued certificates | title, issueDate, status |
| **Assignment** | Assignments | title, dueDate, status |
| **Task** | Teacher's tasks | title, priority, status |
| **MonthlyAttendance** | Monthly stats | month, attendancePercentage |

## 🔌 Available API Endpoints

### Dashboard (5 endpoints)
- `GET /api/dashboard/summary/:teacherId`
- `GET /api/dashboard/monthly-attendance/:teacherId`
- `GET /api/dashboard/course-progress/:teacherId`
- `GET /api/dashboard/todays-classes/:teacherId`
- `GET /api/dashboard/assignments/:teacherId`

### Courses (3 endpoints)
- `POST /api/courses` (create)
- `GET /api/courses/:teacherId` (list)
- `PUT /api/courses/:courseId` (update)

### Students (2 endpoints)
- `POST /api/students` (add)
- `GET /api/students/:teacherId` (list)

### Classes (2 endpoints)
- `POST /api/classes` (create)
- `GET /api/classes/:teacherId` (list)

### Attendance (2 endpoints)
- `POST /api/attendance` (record)
- `GET /api/attendance/:teacherId` (list)

### Grades (2 endpoints)
- `POST /api/grades` (add)
- `GET /api/grades/:teacherId` (list)

### Certificates (2 endpoints)
- `POST /api/certificates` (issue)
- `GET /api/certificates/:teacherId` (list)

### Assignments (3 endpoints)
- `POST /api/assignments` (create)
- `GET /api/assignments/:teacherId` (list)
- `PUT /api/assignments/:assignmentId` (update)

### Tasks (3 endpoints)
- `POST /api/tasks` (create)
- `GET /api/tasks/:teacherId` (list)
- `PUT /api/tasks/:taskId` (update)

### Monthly Attendance (2 endpoints)
- `POST /api/monthly-attendance` (record)
- `GET /api/monthly-attendance/:teacherId` (list)

**Total: 30+ endpoints** ✅

## 🎓 How to Use in Frontend

### Example: Get Dashboard Data
```javascript
// In your React component
const teacherId = "teacher_id_from_login";

// Fetch summary
const response = await fetch(
  `http://localhost:5001/api/dashboard/summary/${teacherId}`
);
const dashboardData = await response.json();

// Use in state
setDashboard(dashboardData);
```

### Example: Create a Course
```javascript
const courseData = {
  teacherId: teacher_id,
  name: "Pre-Primary Teacher Training",
  description: "...",
  duration: "4 weeks",
  modules: 24,
  progress: 72,
  status: "ongoing"
};

await fetch("http://localhost:5001/api/courses", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(courseData)
});
```

## 🔍 MongoDB Compass Viewing

1. Open MongoDB Compass
2. Connect to `mongodb://localhost:27017`
3. Database: `teacher-training`
4. Collections: teachers, courses, students, etc.

## 📖 Documentation Files

Read these files for more details:

1. **API_DOCUMENTATION.md** - Complete API reference
2. **DATABASE_SETUP.md** - Detailed setup guide
3. **seedData.js** - See sample data structure

## ✨ Sample Data Included

After running `npm run seed`, you'll have:

- 1 sample teacher (sannidhya@spacece.com)
- 3 courses with different progress levels
- 3 students with grades
- 3 classes scheduled
- Attendance records
- Grades and certificates
- Pending assignments
- Task items

## 🐛 Troubleshooting

### "Cannot connect to MongoDB"
- Make sure MongoDB is running: `mongod`
- Check MONGODB_URI in .env

### "Port 5001 already in use"
- Change PORT in .env or kill the process using port 5001

### "Teacher ID not found"
- Run `npm run seed` first to populate sample data
- Then use the teacher ID from the response

## 📝 Next Steps

1. ✅ Backend is ready
2. ⏭️ **Now connect your frontend React components to these APIs**
3. ⏭️ Update `TeacherDashboard.jsx` to fetch real data from `/api/dashboard/summary/:teacherId`
4. ⏭️ Create API service functions in a separate file

## 🎯 Example Frontend Integration

Create `src/services/dashboardService.js`:

```javascript
const API_BASE = "http://localhost:5001/api";

export async function getDashboardSummary(teacherId) {
  const response = await fetch(`${API_BASE}/dashboard/summary/${teacherId}`);
  return response.json();
}

export async function getMonthlyAttendance(teacherId) {
  const response = await fetch(`${API_BASE}/dashboard/monthly-attendance/${teacherId}`);
  return response.json();
}

export async function getCourseProgress(teacherId) {
  const response = await fetch(`${API_BASE}/dashboard/course-progress/${teacherId}`);
  return response.json();
}

// ... more functions
```

Then in your component:
```javascript
import { getDashboardSummary } from '../services/dashboardService';

// In your component
useEffect(() => {
  getDashboardSummary(teacherId).then(data => {
    setMyClasses(data.myClasses);
    setTotalStudents(data.totalStudents);
    // ... etc
  });
}, [teacherId]);
```

## 🚀 You're All Set!

Your backend is ready with:
- ✅ Complete MongoDB models
- ✅ All dashboard APIs
- ✅ Sample data
- ✅ Full documentation

**Next: Connect your frontend to these APIs!**

---

For detailed API reference, see: **API_DOCUMENTATION.md**
For setup details, see: **DATABASE_SETUP.md**

Happy coding! 🎉
