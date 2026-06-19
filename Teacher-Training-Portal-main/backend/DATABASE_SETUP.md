# Teacher Training Portal - Backend Setup Guide

## 📋 Project Structure

```
backend/
├── models/                 # MongoDB schemas
│   ├── Teacher.js         # Teacher profile
│   ├── Course.js          # Courses/Training programs
│   ├── Student.js         # Student information
│   ├── Class.js           # Class sessions
│   ├── Attendance.js      # Attendance records
│   ├── Grade.js           # Student grades
│   ├── Certificate.js     # Certificates issued
│   ├── Assignment.js      # Assignments
│   ├── Task.js            # Teacher tasks
│   └── MonthlyAttendance.js # Monthly stats
├── server.js              # Express server & API routes
├── seedData.js            # Sample data seeding script
├── package.json           # Dependencies
├── .env.example           # Environment variables template
├── .env                   # Your local environment config
├── API_DOCUMENTATION.md   # Complete API docs
└── DATABASE_SETUP.md      # This file
```

## 🔧 Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or remote connection)
- npm or yarn

## ⚙️ Installation & Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
```bash
# Copy the example file
cp .env.example .env

# Edit .env with your configuration
```

### .env Configuration
```env
MONGODB_URI=mongodb://localhost:27017/teacher-training
PORT=5001
NODE_ENV=development
```

### 3. Start MongoDB (if running locally)
```bash
# Windows - Make sure MongoDB service is running
mongod

# Or if MongoDB is installed as a service
net start MongoDB
```

### 4. Verify MongoDB Connection
```bash
mongo
# or for MongoDB 5.0+
mongosh
```

## 🚀 Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

Server will run on `http://localhost:5001`

## 📊 Database Setup

### Option 1: Automatic Seeding (Recommended)
Run the seed script to populate sample data:
```bash
npm run seed
```

This will:
- Create a sample teacher (sannidhya@spacece.com / password123)
- Add 3 courses
- Add 3 students
- Create sample classes
- Add attendance records
- Generate grades and certificates
- Create assignments and tasks

### Option 2: Manual Database Creation
Use MongoDB Compass or mongosh to create collections:

```javascript
// Connect to MongoDB
use teacher-training

// Create collections with validation
db.createCollection("teachers", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "email", "password"],
      properties: {
        name: { bsonType: "string" },
        email: { bsonType: "string" },
        password: { bsonType: "string" },
        // ... other fields
      }
    }
  }
})
```

## 🗄️ Database Collections

### Teachers
Stores teacher profile and metadata.
```json
{
  "_id": ObjectId,
  "name": "Sannidhya",
  "email": "sannidhya@spacece.com",
  "phone": "9876543210",
  "subject": "History",
  "workingCenter": "Dhayri, Pune, Maharashtra",
  "status": "approved",
  "createdAt": ISODate,
  "updatedAt": ISODate
}
```

### Courses
Stores course/training program information.
```json
{
  "_id": ObjectId,
  "teacherId": ObjectId,
  "name": "Pre-Primary Teacher Training",
  "modules": 24,
  "completedModules": 17,
  "progress": 72,
  "status": "ongoing"
}
```

### Students
Stores student information.
```json
{
  "_id": ObjectId,
  "teacherId": ObjectId,
  "name": "Priya Sharma",
  "email": "priya@example.com",
  "grade": "A",
  "status": "active"
}
```

### Classes
Stores individual class sessions.
```json
{
  "_id": ObjectId,
  "teacherId": ObjectId,
  "courseId": ObjectId,
  "name": "Grade 5A — Number Patterns",
  "classDate": ISODate,
  "startTime": "08:00 AM",
  "room": "Room 101",
  "status": "completed"
}
```

### Attendance
Tracks attendance records.
```json
{
  "_id": ObjectId,
  "teacherId": ObjectId,
  "studentId": ObjectId,
  "classId": ObjectId,
  "date": ISODate,
  "status": "present"
}
```

### Grades
Stores student assessment scores.
```json
{
  "_id": ObjectId,
  "teacherId": ObjectId,
  "studentId": ObjectId,
  "courseId": ObjectId,
  "assessmentName": "Quiz 1",
  "score": 85,
  "maxScore": 100,
  "percentage": 85,
  "grade": "B"
}
```

### Certificates
Manages issued certificates.
```json
{
  "_id": ObjectId,
  "teacherId": ObjectId,
  "studentId": ObjectId,
  "certificateId": "CERT-20260101",
  "title": "Pre-Primary Teacher Training",
  "issueDate": ISODate,
  "status": "issued"
}
```

### Assignments
Stores assignment information.
```json
{
  "_id": ObjectId,
  "teacherId": ObjectId,
  "courseId": ObjectId,
  "title": "Lesson Plan — Number Pattern",
  "dueDate": ISODate,
  "status": "pending",
  "submittedCount": 0
}
```

### Tasks
Tracks teacher's to-do items.
```json
{
  "_id": ObjectId,
  "teacherId": ObjectId,
  "title": "Review assignment submissions",
  "dueDate": ISODate,
  "priority": "high",
  "status": "pending",
  "category": "grading"
}
```

### MonthlyAttendance
Tracks monthly attendance statistics.
```json
{
  "_id": ObjectId,
  "teacherId": ObjectId,
  "month": 6,
  "year": 2026,
  "attendancePercentage": 94,
  "totalClasses": 20,
  "classesAttended": 19
}
```

## 🔗 API Quick Reference

### Dashboard Summary
```
GET /api/dashboard/summary/:teacherId
Response: { myClasses, totalStudents, attendance, avgGrade, certificates, pendingTasks }
```

### Monthly Attendance Chart
```
GET /api/dashboard/monthly-attendance/:teacherId
Response: [{ month, percentage }]
```

### Course Progress
```
GET /api/dashboard/course-progress/:teacherId
Response: [{ name, modules, completedModules, progress, nextDate }]
```

### Today's Classes
```
GET /api/dashboard/todays-classes/:teacherId
Response: [{ name, startTime, room, status, totalStudents, attendedStudents }]
```

### Assignments Status
```
GET /api/dashboard/assignments/:teacherId
Response: [{ title, dueDate, status, submittedCount, totalStudents }]
```

## 🐛 Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Make sure MongoDB is running on your system.

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5001
```
**Solution**: 
- Change PORT in .env
- Or kill process using port 5001:
```bash
# Windows
netstat -ano | findstr :5001
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :5001
kill -9 <PID>
```

### Seed Script Fails
```
Error: Cannot find module './models/Teacher.js'
```
**Solution**: Make sure you're in the backend directory when running:
```bash
cd backend
npm run seed
```

### Module Not Found Errors
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

## 📚 Example Usage Flow

1. **Register/Login Teacher**
   ```bash
   POST /api/auth/register
   POST /api/auth/login
   ```

2. **Get Dashboard Data**
   ```bash
   GET /api/dashboard/summary/{teacherId}
   GET /api/dashboard/monthly-attendance/{teacherId}
   GET /api/dashboard/course-progress/{teacherId}
   GET /api/dashboard/todays-classes/{teacherId}
   GET /api/dashboard/assignments/{teacherId}
   ```

3. **Manage Data**
   ```bash
   POST /api/students (add student)
   POST /api/courses (create course)
   POST /api/classes (schedule class)
   POST /api/attendance (record attendance)
   POST /api/grades (add grade)
   ```

## 🔐 Security Notes

- Current implementation uses plain text passwords (for demo)
- In production, use bcrypt for password hashing
- Add JWT authentication for API endpoints
- Implement role-based access control (RBAC)
- Use HTTPS for all API communications

## 📈 Performance Optimization

- Add indexes on frequently queried fields (teacherId, studentId, etc.)
- Implement pagination for large result sets
- Cache dashboard data with Redis
- Use aggregation pipelines for complex queries

## 🤝 Next Steps

1. Connect the frontend to these APIs
2. Implement authentication middleware
3. Add data validation middleware
4. Create test suites
5. Deploy to production

## 📞 Support

For issues or questions:
1. Check API_DOCUMENTATION.md for endpoint details
2. Review error messages carefully
3. Check MongoDB logs for connection issues
4. Verify .env configuration

---

**Happy coding! 🎉**
