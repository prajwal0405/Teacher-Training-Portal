import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import Teacher from "./models/Teacher.js";
import Course from "./models/Course.js";
import Student from "./models/Student.js";
import Class from "./models/Class.js";
import Attendance from "./models/Attendance.js";
import Grade from "./models/Grade.js";
import Certificate from "./models/Certificate.js";
import Assignment from "./models/Assignment.js";
import Task from "./models/Task.js";
import MonthlyAttendance from "./models/MonthlyAttendance.js";
import DailyAttendanceSheet from "./models/DailyAttendance.js";
import GeotagAttendance from "./models/GeotagAttendance.js";
import Notification from "./models/Notification.js";
import { verifyToken, verifyRefreshToken } from "./middleware/auth.js";
import { validateEmail, validatePassword, validateRegistrationData, validateLoginData } from "./middleware/validation.js";
import { generateTokenPair } from "./utils/jwt.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// ============ SECURITY MIDDLEWARE ============

// CORS configuration
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:3000"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));

// Rate limiting for login attempts (5 requests per 15 minutes)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for registration (3 requests per hour)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: "Too many registration attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => req.method === "GET"
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("Connected to local MongoDB database successfully.");
    try {
      await DailyAttendanceSheet.syncIndexes();
      await GeotagAttendance.syncIndexes();
      await Notification.syncIndexes();
      console.log("MongoDB indexes synchronized successfully.");
    } catch (indexError) {
      console.error("MongoDB index sync warning:", indexError);
    }
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// ============ AUTHENTICATION ROUTES ============

// Register route - Create new teacher account
app.post("/api/auth/register", registerLimiter, validateRegistrationData, async (req, res) => {
  try {
    const { name, email, phone, address, subject, password } = req.body;
    
    // Check if email already exists
    const existing = await Teacher.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "Email already registered. Please login or use a different email." });
    }

    // Create new teacher - password will be hashed by pre-save middleware
    const newTeacher = new Teacher({
      name: name.trim(),
      email: email.toLowerCase(),
      phone,
      address,
      subject,
      password,
      joined: new Date().toLocaleDateString("en-IN"),
      status: "pending" // Require admin approval
    });

    await newTeacher.save();

    // Return success without password
    const teacherData = newTeacher.toObject();
    delete teacherData.password;

    res.status(201).json({ 
      message: "Registration successful! Your account is pending admin approval.", 
      user: teacherData 
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// Login route - Authenticate teacher and return JWT tokens
app.post("/api/auth/login", loginLimiter, validateLoginData, async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailLower = email.toLowerCase();

    // Find teacher by email
    const teacher = await Teacher.findOne({ email: emailLower });
    if (!teacher) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Check if account is locked after failed attempts
    if (teacher.isAccountLocked()) {
      return res.status(429).json({ error: "Account temporarily locked due to multiple failed login attempts. Please try again later." });
    }

    // Compare password
    const isPasswordValid = await teacher.comparePassword(password);
    if (!isPasswordValid) {
      await teacher.incLoginAttempts();
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Check account status
    if (teacher.status === "pending") {
      return res.status(403).json({ error: "Your account is pending admin approval. Please wait for approval." });
    }
    if (teacher.status === "rejected") {
      return res.status(403).json({ error: "Your account has been rejected. Please contact admin." });
    }

    // Reset login attempts on successful login
    await teacher.resetLoginAttempts();

    // Generate JWT tokens
    const { accessToken, refreshToken } = generateTokenPair(teacher._id, "teacher");

    // Return tokens (accessToken should be stored in httpOnly cookie in production)
    const teacherData = teacher.toObject();
    delete teacherData.password;
    delete teacherData.loginAttempts;
    delete teacherData.lockUntil;

    res.json({ 
      message: "Login successful",
      accessToken,
      refreshToken,
      user: teacherData 
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// Refresh token route - Get new access token using refresh token
app.post("/api/auth/refresh", verifyRefreshToken, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.userId);
    if (!teacher) {
      return res.status(401).json({ error: "User not found." });
    }

    const { accessToken, refreshToken } = generateTokenPair(teacher._id, "teacher");

    res.json({ 
      accessToken,
      refreshToken,
      message: "Token refreshed successfully"
    });
  } catch (error) {
    res.status(401).json({ error: "Token refresh failed." });
  }
});

// Logout route (frontend should delete tokens)
app.post("/api/auth/logout", verifyToken, async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled on the client
    // You could optionally add token to a blacklist if needed
    res.json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ error: "Logout failed." });
  }
});

// Get profile details - Protected endpoint
app.get("/api/profile", verifyToken, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.userId).select("-password -loginAttempts -lockUntil");
    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found." });
    }
    res.json(teacher);
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Failed to fetch profile." });
  }
});

// Update profile details - Protected endpoint
app.put("/api/profile", verifyToken, async (req, res) => {
  try {
    const { name, phone, address, subject } = req.body;
    
    // Only allow updating non-sensitive fields
    const updateData = {
      ...(name && { name: name.trim() }),
      ...(phone && { phone }),
      ...(address && { address }),
      ...(subject && { subject })
    };

    const teacher = await Teacher.findByIdAndUpdate(
      req.userId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password -loginAttempts -lockUntil");

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found." });
    }
    res.json({ message: "Profile updated successfully", user: teacher });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Failed to update profile." });
  }
});

// Change Password route - Protected endpoint
app.put("/api/profile/password", verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "All password fields are required." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "New passwords do not match." });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({ 
        error: "New password must be at least 8 characters with 1 uppercase letter, 1 number, and 1 special character." 
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: "New password must be different from current password." });
    }

    // Find teacher and verify current password
    const teacher = await Teacher.findById(req.userId);
    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found." });
    }

    const isPasswordValid = await teacher.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }

    // Update password (will be hashed by pre-save middleware)
    teacher.password = newPassword;
    await teacher.save();

    res.json({ message: "Password changed successfully!" });
  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({ error: "Failed to change password." });
  }
});

// ============== DASHBOARD ENDPOINTS ==============

const buildOverviewPayload = async (teacherId) => {
  const teacher = await Teacher.findById(teacherId).lean();
  if (!teacher) return null;

  const [courses, assignments, certificates, classes, grades, tasks, notifications] = await Promise.all([
    Course.find({ teacherId }).sort({ createdAt: 1 }).lean(),
    Assignment.find({ teacherId }).sort({ dueDate: 1 }).limit(5).lean(),
    Certificate.find({ teacherId }).sort({ issueDate: -1 }).limit(5).lean(),
    Class.find({ teacherId }).sort({ classDate: 1, startTime: 1 }).lean(),
    Grade.find({ teacherId }).sort({ dateGraded: -1 }).lean(),
    Task.find({ teacherId }).sort({ dueDate: 1 }).lean(),
    Notification.find({ teacherId }).sort({ createdAt: -1 }).limit(5).lean()
  ]);

  const attendanceRecords = await Attendance.find({ teacherId }).lean();
  const attendancePercentage = attendanceRecords.length > 0
    ? Math.round((attendanceRecords.filter(a => a.status === "present").length / attendanceRecords.length) * 100)
    : (teacher.attendance || 0);

  const avgGrade = grades.length > 0
    ? Math.round(grades.reduce((acc, grade) => acc + (grade.percentage || 0), 0) / grades.length)
    : 0;

  const summary = {
    myClasses: classes.length || teacher.classes || 0,
    totalStudents: await Student.countDocuments({ teacherId }),
    attendance: attendancePercentage,
    avgGrade,
    certificates: certificates.length,
    pendingTasks: tasks.filter(task => task.status === "pending").length
  };

  const monthlyAttendance = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  for (let i = 0; i < 6; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const monthlyRecord = await MonthlyAttendance.findOne({ teacherId, month, year }).lean();
    monthlyAttendance.push({
      month: monthNames[i],
      val: monthlyRecord?.attendancePercentage || Math.floor(attendancePercentage || 85)
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const schedule = classes
    .filter(item => {
      const classDate = new Date(item.classDate);
      classDate.setHours(0, 0, 0, 0);
      return classDate >= today && classDate < tomorrow;
    })
    .slice(0, 6)
    .map(item => ({
      time: item.startTime || "--:--",
      class: item.name,
      topic: item.description || item.name,
      room: item.room || "TBD",
      status: item.status || "upcoming"
    }));

  const courseProgress = courses.slice(0, 3).map(course => ({
    id: course._id,
    title: course.name,
    progress: course.progress || 0,
    total: course.modules || 0,
    completed: course.completedModules || 0,
    nextSession: course.nextDate ? new Date(course.nextDate).toLocaleDateString("en-IN") : "--/--/----",
    status: course.status || "ongoing"
  }));

  const gradeCards = grades.slice(0, 6).map(grade => ({
    class: grade.assessmentName,
    students: 1,
    avg: grade.percentage || 0,
    highest: grade.score || 0,
    lowest: grade.score || 0,
    assignments: 1,
    completed: 1
  }));

  return {
    teacher,
    summary,
    monthlyAttendance,
    courses: courseProgress,
    schedule,
    grades: gradeCards,
    assignments: assignments.map(item => ({
      id: item._id,
      title: item.title,
      course: item.courseId?.name || "Teacher Training",
      due: item.dueDate ? new Date(item.dueDate).toLocaleDateString("en-IN") : "--/--/----",
      status: item.status,
      score: item.totalMarks && item.submittedCount ? Math.round((item.submittedCount / item.totalMarks) * 100) : null
    })),
    certificates: certificates.map(item => ({
      id: item._id,
      title: item.title,
      issued: item.issueDate ? new Date(item.issueDate).toLocaleDateString("en-IN") : "--/--/----",
      grade: item.status === "issued" ? "A" : "Pending",
      credentialId: item.certificateId || String(item._id).slice(-8)
    })),
    notifications: notifications.map(item => ({
      id: item._id,
      type: item.type,
      msg: item.message,
      time: item.timeLabel || (item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN") : "just now"),
      read: Boolean(item.read)
    }))
  };
};

app.get("/api/dashboard/overview", verifyToken, async (req, res) => {
  try {
    const payload = await buildOverviewPayload(req.userId);
    if (!payload) {
      return res.status(404).json({ error: "Teacher not found." });
    }
    res.json(payload);
  } catch (error) {
    console.error("Dashboard overview error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard overview." });
  }
});

app.get("/api/notifications/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const notifications = await Notification.find({ teacherId }).sort({ createdAt: -1 }).lean();
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/notifications", async (req, res) => {
  try {
    const { teacherId, type, message, timeLabel, read, relatedId, relatedType } = req.body;
    if (!teacherId || !type || !message) {
      return res.status(400).json({ error: "teacherId, type and message are required." });
    }

    const notification = await Notification.create({
      teacherId,
      type,
      message,
      timeLabel,
      read: Boolean(read),
      relatedId,
      relatedType
    });

    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/notifications/:teacherId/mark-all-read", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const result = await Notification.updateMany({ teacherId, read: false }, { $set: { read: true } });
    res.json({ message: "All notifications marked as read.", modifiedCount: result.modifiedCount || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Dashboard Summary for a teacher
app.get("/api/dashboard/summary", verifyToken, async (req, res) => {
  try {
    const teacherId = req.userId;
    
    const classes = await Class.countDocuments({ teacherId });
    const students = await Student.countDocuments({ teacherId });
    
    // Calculate attendance percentage
    const attendanceRecords = await Attendance.find({ teacherId });
    const attendancePercentage = attendanceRecords.length > 0
      ? Math.round((attendanceRecords.filter(a => a.status === "present").length / attendanceRecords.length) * 100)
      : 0;
    
    // Calculate average grade
    const grades = await Grade.find({ teacherId });
    const avgGrade = grades.length > 0
      ? Math.round(grades.reduce((acc, g) => acc + (g.percentage || 0), 0) / grades.length)
      : 0;
    
    // Count certificates
    const certificates = await Certificate.countDocuments({ teacherId, status: "issued" });
    
    // Count pending tasks
    const tasks = await Task.countDocuments({ teacherId, status: "pending" });
    
    res.json({
      myClasses: classes,
      totalStudents: students,
      attendance: attendancePercentage,
      avgGrade: avgGrade,
      certificates: certificates,
      pendingTasks: tasks
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard summary." });
  }
});

// Get Monthly Attendance Data
app.get("/api/dashboard/monthly-attendance", verifyToken, async (req, res) => {
  try {
    const teacherId = req.userId;
    
    // Get data for last 6 months
    const monthlyData = [];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      
      const monthlyRecord = await MonthlyAttendance.findOne({
        teacherId,
        month,
        year
      });
      
      monthlyData.push({
        month: months[i],
        percentage: monthlyRecord?.attendancePercentage || Math.floor(Math.random() * 20 + 80)
      });
    }
    
    res.json(monthlyData);
  } catch (error) {
    console.error("Monthly attendance error:", error);
    res.status(500).json({ error: "Failed to fetch monthly attendance data." });
  }
});

// Get Course Progress
app.get("/api/dashboard/course-progress", verifyToken, async (req, res) => {
  try {
    const teacherId = req.userId;
    
    const courses = await Course.find({ teacherId }).limit(5);
    
    const courseProgress = courses.map(course => ({
      name: course.name,
      modules: course.modules,
      completedModules: course.completedModules,
      progress: course.progress,
      nextDate: course.nextDate
    }));
    
    res.json(courseProgress);
  } catch (error) {
    console.error("Course progress error:", error);
    res.status(500).json({ error: "Failed to fetch course progress." });
  }
});

// Get Today's Classes
app.get("/api/dashboard/todays-classes", verifyToken, async (req, res) => {
  try {
    const teacherId = req.userId;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todaysClasses = await Class.find({
      teacherId,
      classDate: {
        $gte: today,
        $lt: tomorrow
      }
    }).sort({ classDate: 1 });
    
    const classesData = todaysClasses.map(c => ({
      _id: c._id,
      name: c.name,
      startTime: c.startTime,
      room: c.room,
      status: c.status,
      totalStudents: c.totalStudents,
      attendedStudents: c.attendedStudents
    }));
    
    res.json(classesData);
  } catch (error) {
    console.error("Today's classes error:", error);
    res.status(500).json({ error: "Failed to fetch today's classes." });
  }
});

// Get Assignment Status
app.get("/api/dashboard/assignments", verifyToken, async (req, res) => {
  try {
    const teacherId = req.userId;
    
    const assignments = await Assignment.find({ teacherId }).sort({ dueDate: 1 }).limit(5);
    
    const assignmentData = assignments.map(a => ({
      _id: a._id,
      title: a.title,
      dueDate: a.dueDate,
      status: a.status,
      submittedCount: a.submittedCount,
      totalStudents: a.totalStudents
    }));
    
    res.json(assignmentData);
  } catch (error) {
    console.error("Assignments error:", error);
    res.status(500).json({ error: "Failed to fetch assignments." });
  }
});

// ============== COURSE ENDPOINTS ==============

// Add a new course
app.post("/api/courses", async (req, res) => {
  try {
    const { teacherId, name, description, duration, modules, status } = req.body;
    
    const newCourse = new Course({
      teacherId,
      name,
      description,
      duration,
      modules,
      status: status || "ongoing"
    });
    
    await newCourse.save();
    res.status(201).json(newCourse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all courses for a teacher
app.get("/api/courses/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const courses = await Course.find({ teacherId });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update course progress
app.put("/api/courses/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params;
    const updateData = req.body;
    
    const course = await Course.findByIdAndUpdate(courseId, updateData, { new: true });
    if (!course) {
      return res.status(404).json({ error: "Course not found." });
    }
    
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== STUDENT ENDPOINTS ==============

// Add a new student
app.post("/api/students", async (req, res) => {
  try {
    const { teacherId, name, email, phone, grade } = req.body;
    
    const newStudent = new Student({
      teacherId,
      name,
      email,
      phone,
      grade
    });
    
    await newStudent.save();
    res.status(201).json(newStudent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all students for a teacher
app.get("/api/students/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const students = await Student.find({ teacherId });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== CLASS ENDPOINTS ==============

// Add a new class
app.post("/api/classes", async (req, res) => {
  try {
    const { teacherId, courseId, name, description, classDate, startTime, endTime, room, students } = req.body;
    
    const newClass = new Class({
      teacherId,
      courseId,
      name,
      description,
      classDate,
      startTime,
      endTime,
      room,
      students: students || [],
      totalStudents: students?.length || 0
    });
    
    await newClass.save();
    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all classes for a teacher
app.get("/api/classes/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const classes = await Class.find({ teacherId }).populate("students");
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== ATTENDANCE ENDPOINTS ==============

// Record attendance
app.post("/api/attendance", async (req, res) => {
  try {
    const { teacherId, studentId, classId, date, status, remarks } = req.body;
    
    const newAttendance = new Attendance({
      teacherId,
      studentId,
      classId,
      date,
      status,
      remarks
    });
    
    await newAttendance.save();
    res.status(201).json(newAttendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get attendance records
app.get("/api/attendance/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const attendance = await Attendance.find({ teacherId }).populate("studentId classId");
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== GRADE ENDPOINTS ==============

// Add a grade
app.post("/api/grades", async (req, res) => {
  try {
    const { teacherId, studentId, courseId, assessmentName, score, maxScore, feedback } = req.body;
    
    const percentage = (score / maxScore) * 100;
    let grade = "F";
    if (percentage >= 90) grade = "A";
    else if (percentage >= 80) grade = "B";
    else if (percentage >= 70) grade = "C";
    else if (percentage >= 60) grade = "D";
    
    const newGrade = new Grade({
      teacherId,
      studentId,
      courseId,
      assessmentName,
      score,
      maxScore,
      percentage,
      grade,
      feedback
    });
    
    await newGrade.save();
    res.status(201).json(newGrade);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get grades
app.get("/api/grades/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const grades = await Grade.find({ teacherId }).populate("studentId courseId");
    res.json(grades);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== CERTIFICATE ENDPOINTS ==============

// Issue a certificate
app.post("/api/certificates", async (req, res) => {
  try {
    const { teacherId, studentId, courseId, title, expiryDate } = req.body;
    
    const certificateId = `CERT-${Date.now()}`;
    
    const newCertificate = new Certificate({
      teacherId,
      studentId,
      courseId,
      certificateId,
      title,
      expiryDate,
      status: "issued"
    });
    
    await newCertificate.save();
    res.status(201).json(newCertificate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get certificates
app.get("/api/certificates/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const certificates = await Certificate.find({ teacherId }).populate("studentId courseId");
    res.json(certificates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== ASSIGNMENT ENDPOINTS ==============

// Create an assignment
app.post("/api/assignments", async (req, res) => {
  try {
    const { teacherId, courseId, title, description, dueDate, totalMarks, totalStudents } = req.body;
    
    const newAssignment = new Assignment({
      teacherId,
      courseId,
      title,
      description,
      dueDate,
      totalMarks,
      totalStudents: totalStudents || 0
    });
    
    await newAssignment.save();
    res.status(201).json(newAssignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get assignments
app.get("/api/assignments/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const assignments = await Assignment.find({ teacherId }).populate("courseId");
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update assignment
app.put("/api/assignments/:assignmentId", async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const assignment = await Assignment.findByIdAndUpdate(assignmentId, req.body, { new: true });
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found." });
    }
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== TASK ENDPOINTS ==============

// Create a task
app.post("/api/tasks", async (req, res) => {
  try {
    const { teacherId, title, description, dueDate, priority, category } = req.body;
    
    const newTask = new Task({
      teacherId,
      title,
      description,
      dueDate,
      priority: priority || "medium",
      category
    });
    
    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tasks
app.get("/api/tasks/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const tasks = await Task.find({ teacherId }).sort({ dueDate: 1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update task status
app.put("/api/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findByIdAndUpdate(taskId, req.body, { new: true });
    if (!task) {
      return res.status(404).json({ error: "Task not found." });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== MONTHLY ATTENDANCE ENDPOINTS ==============

// Record monthly attendance
app.post("/api/monthly-attendance", async (req, res) => {
  try {
    const { teacherId, month, year, attendancePercentage, totalClasses, classesAttended } = req.body;
    
    const monthlyRecord = await MonthlyAttendance.findOneAndUpdate(
      { teacherId, month, year },
      {
        attendancePercentage,
        totalClasses,
        classesAttended
      },
      { upsert: true, new: true }
    );
    
    res.status(201).json(monthlyRecord);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get monthly attendance
app.get("/api/monthly-attendance/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const monthlyRecords = await MonthlyAttendance.find({ teacherId }).sort({ year: -1, month: -1 });
    res.json(monthlyRecords);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const normalizeSheetDate = (value) => {
  if (!value) return new Date().toISOString().split("T")[0];
  return String(value).includes("T") ? String(value).split("T")[0] : String(value);
};

const parseAttendanceRoster = (roster = []) =>
  roster.map((entry, index) => ({
    rollNo: Number(entry.rollNo) || index + 1,
    name: String(entry.name || "").trim(),
    status: ["P", "A", "L"].includes(entry.status) ? entry.status : "P"
  }));

// ============== DAILY ATTENDANCE ENDPOINTS ==============

app.get("/api/daily-attendance/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { subject, date } = req.query;
    const filter = { teacherId };
    if (subject) filter.subject = subject;
    if (date) filter.sheetDate = normalizeSheetDate(date);

    const sheets = await DailyAttendanceSheet.find(filter).sort({ sheetDate: -1 });
    res.json(sheets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/daily-attendance/:teacherId/sheet", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { subject, date } = req.query;

    if (!subject || !date) {
      return res.status(400).json({ error: "subject and date are required." });
    }

    const sheetDate = normalizeSheetDate(date);
    const sheet = await DailyAttendanceSheet.findOne({ teacherId, subject, sheetDate });

    if (!sheet) {
      return res.status(404).json({ error: "Daily attendance sheet not found." });
    }

    res.json(sheet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/daily-attendance/:teacherId/roster", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { teacherEmail, subject, sheetDate, roster, notes } = req.body;

    if (!teacherEmail || !subject || !sheetDate) {
      return res.status(400).json({ error: "teacherEmail, subject and sheetDate are required." });
    }

    const normalizedDate = normalizeSheetDate(sheetDate);
    const cleanRoster = parseAttendanceRoster(roster || []);

    const sheet = await DailyAttendanceSheet.findOneAndUpdate(
      { teacherId, subject, sheetDate: normalizedDate },
      {
        teacherEmail,
        subject,
        sheetDate: normalizedDate,
        roster: cleanRoster,
        notes: notes || "",
        isLocked: false,
        lockedAt: null,
        lockedBy: null,
        lockedEmail: null
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Sync roster entries to individual student Attendance documents
    try {
      const studentDocs = await Student.find({ teacherId });
      await Promise.all(cleanRoster.map(async (child) => {
        const studentDoc = studentDocs.find(s => s.name === child.name);
        if (studentDoc) {
          const statusMap = { P: "present", A: "absent", L: "excused" };
          const dbStatus = statusMap[child.status] || "present";
          await Attendance.findOneAndUpdate(
            { teacherId, studentId: studentDoc._id, date: new Date(normalizedDate) },
            { status: dbStatus, date: new Date(normalizedDate) },
            { upsert: true }
          );
        }
      }));
    } catch (syncError) {
      console.error("Failed to sync daily attendance to Attendance collection:", syncError);
    }

    res.status(201).json(sheet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/daily-attendance/:teacherId/sheet", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { teacherEmail, subject, sheetDate, roster, isLocked, notes } = req.body;

    if (!teacherEmail || !subject || !sheetDate) {
      return res.status(400).json({ error: "teacherEmail, subject and sheetDate are required." });
    }

    const normalizedDate = normalizeSheetDate(sheetDate);
    const cleanRoster = parseAttendanceRoster(roster || []);
    const locked = Boolean(isLocked);

    const sheet = await DailyAttendanceSheet.findOneAndUpdate(
      { teacherId, subject, sheetDate: normalizedDate },
      {
        teacherEmail,
        subject,
        sheetDate: normalizedDate,
        roster: cleanRoster,
        notes: notes || "",
        isLocked: locked,
        lockedAt: locked ? new Date() : null,
        lockedBy: teacherEmail,
        lockedEmail: teacherEmail
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Sync roster entries to individual student Attendance documents
    try {
      const studentDocs = await Student.find({ teacherId });
      await Promise.all(cleanRoster.map(async (child) => {
        const studentDoc = studentDocs.find(s => s.name === child.name);
        if (studentDoc) {
          const statusMap = { P: "present", A: "absent", L: "excused" };
          const dbStatus = statusMap[child.status] || "present";
          await Attendance.findOneAndUpdate(
            { teacherId, studentId: studentDoc._id, date: new Date(normalizedDate) },
            { status: dbStatus, date: new Date(normalizedDate) },
            { upsert: true }
          );
        }
      }));
    } catch (syncError) {
      console.error("Failed to sync daily attendance to Attendance collection:", syncError);
    }

    res.json(sheet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/daily-attendance/:teacherId/sheet", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { subject, sheetDate } = req.body;

    if (!subject || !sheetDate) {
      return res.status(400).json({ error: "subject and sheetDate are required." });
    }

    const normalizedDate = normalizeSheetDate(sheetDate);
    await DailyAttendanceSheet.deleteOne({ teacherId, subject, sheetDate: normalizedDate });
    
    // Also delete corresponding Attendance records to keep it in sync
    try {
      await Attendance.deleteMany({ teacherId, date: new Date(normalizedDate) });
    } catch (syncError) {
      console.error("Failed to clear synced Attendance records on delete:", syncError);
    }

    res.json({ message: "Daily attendance sheet deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== GEOTAG ATTENDANCE ENDPOINTS ==============

app.get("/api/geotag-attendance/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const logs = await GeotagAttendance.find({ teacherId }).sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/geotag-attendance/:teacherId/today", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const todayKey = new Date().toISOString().split("T")[0];
    const todayLog = await GeotagAttendance.findOne({ teacherId, dateKey: todayKey });
    res.json(todayLog || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/geotag-attendance/:teacherId/checkin", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { teacherEmail, dateKey, dateLabel, time, coords, latitude, longitude, distanceOffset, snapshot, campusLat, campusLng } = req.body;

    if (!teacherEmail || !dateKey || !dateLabel || !time) {
      return res.status(400).json({ error: "teacherEmail, dateKey, dateLabel and time are required." });
    }

    const log = await GeotagAttendance.findOneAndUpdate(
      { teacherId, dateKey, actionType: "checkin" },
      {
        teacherEmail,
        dateLabel,
        actionType: "checkin",
        checkInTime: time,
        coords,
        latitude,
        longitude,
        distanceOffset,
        snapshot,
        campusLat: campusLat ?? 18.6675,
        campusLng: campusLng ?? 73.8961,
        verified: true,
        status: "Verified Attendance Logged"
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/geotag-attendance/:teacherId/checkout", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { teacherEmail, dateKey, dateLabel, time, coords, latitude, longitude, distanceOffset, snapshot, campusLat, campusLng } = req.body;

    if (!teacherEmail || !dateKey || !dateLabel || !time) {
      return res.status(400).json({ error: "teacherEmail, dateKey, dateLabel and time are required." });
    }

    const log = await GeotagAttendance.findOneAndUpdate(
      { teacherId, dateKey, actionType: "checkout" },
      {
        teacherEmail,
        dateLabel,
        actionType: "checkout",
        checkOutTime: time,
        coords,
        latitude,
        longitude,
        distanceOffset,
        snapshot,
        campusLat: campusLat ?? 18.6675,
        campusLng: campusLng ?? 73.8961,
        verified: true,
        status: "Verified Attendance Logged"
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/geotag-attendance/:teacherId/all", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const result = await GeotagAttendance.deleteMany({ teacherId });
    res.json({ message: "All geotag attendance logs deleted successfully.", deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/geotag-attendance/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { dateKey } = req.body;

    if (!dateKey) {
      return res.status(400).json({ error: "dateKey is required." });
    }

    await GeotagAttendance.deleteOne({ teacherId, dateKey });
    res.json({ message: "Geotag attendance entry deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dummy route to prevent Chrome DevTools 404/CSP warnings when inspecting local server
app.get("/.well-known/appspecific/com.chrome.devtools.json", (req, res) => {
  res.setHeader("Content-Security-Policy", "default-src *; connect-src *; script-src *; style-src *; img-src *");
  res.status(200).json({});
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

