import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { connectDb } from "./db.js";
import { hashPassword, requireAuth, requireRole, signToken, verifyPassword } from "./auth.js";
import { autoSeed } from "./auto-seed.js";
import { User } from "./models/User.js";
import { Center } from "./models/Center.js";
import { ClassModel } from "./models/Class.js";
import { Child } from "./models/Child.js";
import { Course } from "./models/Course.js";
import { CourseAssignment } from "./models/CourseAssignment.js";
import { LessonPlan } from "./models/LessonPlan.js";
import { LessonPlanAssignment } from "./models/LessonPlanAssignment.js";
import { LessonCompletionReport } from "./models/LessonCompletionReport.js";
import { ActivitySubmission } from "./models/ActivitySubmission.js";
import { Trainer } from "./models/Trainer.js";
import { Feedback } from "./models/Feedback.js";
import { FileAsset } from "./models/FileAsset.js";
import { ChildAttendanceSession, TeacherAttendanceRecord } from "./models/Attendance.js";
import { Notification } from "./models/Notification.js";
import { ReportJob } from "./models/ReportJob.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();
const port = process.env.PORT || 5000;
const databaseModels = [
  ActivitySubmission,
  Center,
  ChildAttendanceSession,
  Child,
  ClassModel,
  CourseAssignment,
  Course,
  Feedback,
  FileAsset,
  LessonCompletionReport,
  LessonPlan,
  LessonPlanAssignment,
  Notification,
  ReportJob,
  TeacherAttendanceRecord,
  Trainer,
  User,
];

async function ensureDatabaseReady() {
  for (const model of databaseModels) {
    await model.createCollection();
    await model.syncIndexes();
  }

  const teacherCount = await User.countDocuments({ role: "teacher" });
  if (teacherCount === 0) {
    await autoSeed();
  } else {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@spaceece.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";
    const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase(), role: "admin" });

    if (!existingAdmin) {
      await User.create({
        role: "admin",
        name: "System Administrator",
        email: adminEmail,
        phone: "9999999999",
        passwordHash: await hashPassword(adminPassword),
        status: "approved",
      });
      console.log(`Initial admin created: ${adminEmail}`);
    }
  }
}

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  ...(process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
];

function isAllowedOrigin(origin) {
  if (!origin || allowedOrigins.includes(origin)) {
    return true;
  }

  try {
    const { hostname, protocol } = new URL(origin);
    return (
      process.env.NODE_ENV !== "production" &&
      protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(hostname)
    );
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "teacher-training-portal-api", database: "mongodb" });
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email).toLowerCase().trim() });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.status !== "approved") {
      return res.status(403).json({ message: `Account is ${user.status}` });
    }

    const token = signToken({
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
    });

    res.json({
      token,
      user: {
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/register-teacher", async (req, res, next) => {
  try {
    const { name, email, phone, password, qualification, subject, experience, address, center, class: classId } = req.body;
    const passwordHash = await hashPassword(password);

    const teacher = await User.create({
      role: "teacher",
      name,
      email,
      phone,
      passwordHash,
      status: "pending",
      teacherProfile: { qualification, subject, experience, address, center, class: classId },
    });

    res.status(201).json({
      teacher: {
        id: teacher._id,
        role: teacher.role,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        status: teacher.status,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already registered" });
    }
    next(error);
  }
});

app.get("/api/admin/dashboard", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);

    const [
      totalCenters,
      totalTeachers,
      totalChildren,
      pendingActivities,
      teacherAttendanceToday,
      childAttendanceThisWeek,
      assignedCourses,
      completedCourses,
      pendingLessons,
    ] = await Promise.all([
      Center.countDocuments({ status: "active" }),
      User.countDocuments({ role: "teacher" }),
      Child.countDocuments({ status: "active" }),
      ActivitySubmission.countDocuments({ status: "pending" }),
      TeacherAttendanceRecord.countDocuments({ attendanceDate: today, status: { $in: ["present", "late"] } }),
      ChildAttendanceSession.countDocuments({ attendanceDate: { $gte: weekStart, $lte: new Date() } }),
      CourseAssignment.countDocuments(),
      CourseAssignment.countDocuments({ status: "completed" }),
      LessonPlanAssignment.countDocuments({ status: "pending" }),
    ]);

    res.json({
      totalCenters,
      totalTeachers,
      totalChildren,
      pendingActivities,
      teacherAttendanceToday,
      childAttendanceThisWeek,
      assignedCourses,
      completedCourses,
      pendingLessons,
      courseCompletionPercent: assignedCourses ? Math.round((completedCourses / assignedCourses) * 100) : 0,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/centers", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const rawCenters = await Center.find().sort({ createdAt: -1 });
    const centers = await Promise.all(rawCenters.map(async (center) => {
      const [teachers, children, classes] = await Promise.all([
        User.find({ role: "teacher", "teacherProfile.center": center._id }).select("_id"),
        Child.countDocuments({ center: center._id, status: "active" }),
        ClassModel.countDocuments({ center: center._id }),
      ]);

      return {
        ...center.toObject(),
        teachers: teachers.map((teacher) => teacher._id),
        children,
        classes,
      };
    }));

    res.json({ centers });
  } catch (error) {
    next(error);
  }
});

app.post("/api/centers", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { teachers = [], ...centerPayload } = req.body;
    const center = await Center.create(centerPayload);
    if (teachers.length) {
      await User.updateMany(
        { _id: { $in: teachers }, role: "teacher" },
        { $set: { "teacherProfile.center": center._id } }
      );
    }
    res.status(201).json({ center });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/classes", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const filter = req.query.centerId ? { center: req.query.centerId } : {};
    const classes = await ClassModel.find(filter).populate("center", "name city").sort({ createdAt: -1 });
    res.json({ classes });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/classes", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const classRecord = await ClassModel.create(req.body);
    res.status(201).json({ class: classRecord });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/teachers", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const teachers = await User.find({ role: "teacher" })
      .select("-passwordHash")
      .populate("teacherProfile.center", "name city")
      .populate("teacherProfile.class", "name ageGroup")
      .sort({ createdAt: -1 });

    res.json({ teachers });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/teachers/:id/status", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const teacher = await User.findOneAndUpdate(
      { _id: req.params.id, role: "teacher" },
      { status: req.body.status },
      { new: true }
    ).select("-passwordHash");

    res.json({ teacher });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/children", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.centerId) filter.center = req.query.centerId;
    if (req.query.classId) filter.class = req.query.classId;

    const children = await Child.find(filter)
      .populate("center", "name city")
      .populate("class", "name ageGroup")
      .sort({ createdAt: -1 });

    res.json({ children });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/children", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const child = await Child.create(req.body);
    res.status(201).json({ child });
  } catch (error) {
    next(error);
  }
});

app.get("/api/courses", requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === "admin") {
      const courses = await Course.find().sort({ createdAt: -1 });
      return res.json({ courses });
    }

    const assignments = await CourseAssignment.find({ teacher: req.user.id })
      .populate("course")
      .sort({ createdAt: -1 });

    res.json({ courses: assignments });
  } catch (error) {
    next(error);
  }
});

app.post("/api/courses", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const course = await Course.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ course });
  } catch (error) {
    next(error);
  }
});

app.get("/api/teacher/me", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const teacher = await User.findById(req.user.id)
      .select("-passwordHash")
      .populate("teacherProfile.center", "name address city pincode contactPerson phone email")
      .populate("teacherProfile.class", "name ageGroup curriculumLevel schedule");

    res.json({ teacher });
  } catch (error) {
    next(error);
  }
});

app.get("/api/teacher/children", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const teacher = await User.findById(req.user.id).select("teacherProfile");
    const classId = teacher?.teacherProfile?.class;

    if (!classId) {
      return res.json({ children: [] });
    }

    const children = await Child.find({ class: classId, status: "active" })
      .populate("center", "name city")
      .populate("class", "name ageGroup curriculumLevel schedule")
      .sort({ rollNo: 1, fullName: 1 });

    res.json({ children });
  } catch (error) {
    next(error);
  }
});

async function getNextChildRollNo(classId) {
  let nextNumber = await Child.countDocuments({ class: classId }) + 1;

  while (true) {
    const rollNo = `CH-${String(nextNumber).padStart(3, "0")}`;
    const existing = await Child.exists({ class: classId, rollNo });
    if (!existing) return rollNo;
    nextNumber += 1;
  }
}

app.post("/api/teacher/children", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const teacher = await User.findById(req.user.id).select("teacherProfile");
    const centerId = teacher?.teacherProfile?.center;
    const classId = teacher?.teacherProfile?.class;

    if (!centerId || !classId) {
      return res.status(400).json({ message: "Teacher is not assigned to a center and class yet" });
    }

    const child = await Child.create({
      ...req.body,
      center: centerId,
      class: classId,
      rollNo: await getNextChildRollNo(classId),
      status: req.body.status || "active",
    });

    res.status(201).json({ child });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "A child with this roll number already exists in this class. Please try again." });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

app.get("/api/teacher/progress", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const [courses, lessons, activities, attendance] = await Promise.all([
      CourseAssignment.find({ teacher: req.user.id }).populate("course", "title category level"),
      LessonPlanAssignment.find({ teacher: req.user.id }).populate("lessonPlan", "title scheduleDate"),
      ActivitySubmission.find({ teacher: req.user.id }).sort({ activityDate: -1 }),
      TeacherAttendanceRecord.find({ teacher: req.user.id }).sort({ attendanceDate: -1 }),
    ]);

    const completedCourses = courses.filter((item) => item.status === "completed" || item.progressPercent === 100).length;
    const completedLessons = lessons.filter((item) => item.status === "completed" || item.status === "reviewed").length;
    const attendancePresent = attendance.filter((item) => ["present", "late"].includes(item.status)).length;

    res.json({
      courses,
      lessons,
      activities,
      summary: {
        totalCourses: courses.length,
        completedCourses,
        courseProgressPercent: courses.length
          ? Math.round(courses.reduce((sum, item) => sum + (item.progressPercent || 0), 0) / courses.length)
          : 0,
        totalLessons: lessons.length,
        completedLessons,
        pendingLessons: lessons.filter((item) => item.status === "pending").length,
        submittedActivities: activities.length,
        approvedActivities: activities.filter((item) => item.status === "approved").length,
        attendanceRate: attendance.length ? Math.round((attendancePresent / attendance.length) * 100) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/teacher/chatbot", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const message = String(req.body.message || "").trim();
    const text = message.toLowerCase();

    const [teacher, courseCount, pendingLessons, pendingActivities, notifications] = await Promise.all([
      User.findById(req.user.id)
        .select("-passwordHash")
        .populate("teacherProfile.center", "name city")
        .populate("teacherProfile.class", "name schedule"),
      CourseAssignment.countDocuments({ teacher: req.user.id }),
      LessonPlanAssignment.countDocuments({ teacher: req.user.id, status: "pending" }),
      ActivitySubmission.countDocuments({ teacher: req.user.id, status: "pending" }),
      Notification.countDocuments({ recipient: req.user.id, read: false }),
    ]);

    let reply = "I can help with attendance, lesson plans, activities, courses, profile, and notifications. Tell me what you want to do.";

    if (text.includes("attendance")) {
      reply = "Open Daily Attendance to mark children present, absent, or late. Use Geotag Attendance for your own teacher attendance.";
    } else if (text.includes("lesson") || text.includes("plan")) {
      reply = `You have ${pendingLessons} pending lesson plan${pendingLessons === 1 ? "" : "s"}. Open Training & Lessons to view, complete, add notes, and upload evidence.`;
    } else if (text.includes("course") || text.includes("training")) {
      reply = `You currently have ${courseCount} assigned course${courseCount === 1 ? "" : "s"}. Open My Courses to view material and progress.`;
    } else if (text.includes("activity") || text.includes("upload")) {
      reply = `You have ${pendingActivities} activity submission${pendingActivities === 1 ? "" : "s"} waiting for admin review. Open Training & Lessons, then Classroom Activities to upload more evidence.`;
    } else if (text.includes("center") || text.includes("class")) {
      reply = `Your assigned center is ${teacher?.teacherProfile?.center?.name || "not assigned yet"} and your class is ${teacher?.teacherProfile?.class?.name || "not assigned yet"}.`;
    } else if (text.includes("notification") || text.includes("alert")) {
      reply = `You have ${notifications} unread notification${notifications === 1 ? "" : "s"}. Open Notifications to review them.`;
    } else if (text.includes("profile") || text.includes("phone") || text.includes("qualification")) {
      reply = "Open My Profile to update your phone, address, qualification, subject, and experience.";
    }

    res.json({ reply });
  } catch (error) {
    next(error);
  }
});

app.get("/api/teacher/lesson-plans", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const lessonPlans = await LessonPlanAssignment.find({ teacher: req.user.id })
      .populate({
        path: "lessonPlan",
        populate: { path: "course", select: "title category level" },
      })
      .sort({ assignedDate: -1 });

    res.json({ lessonPlans });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// FILE UPLOAD SUPPORT
// ==========================================
const uploadDir = process.env.UPLOAD_DIR || "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }
});

app.post("/api/upload", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const asset = await FileAsset.create({
      owner: req.user.id,
      originalName: req.file.originalname,
      storageKey: req.file.filename,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      publicUrl: `/uploads/${req.file.filename}`
    });
    res.status(201).json({ asset });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// CENTER MANAGEMENT
// ==========================================
app.patch("/api/centers/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { teachers = [], ...centerPayload } = req.body;
    const center = await Center.findByIdAndUpdate(req.params.id, centerPayload, { new: true });
    if (teachers.length) {
      await User.updateMany(
        { _id: { $in: teachers }, role: "teacher" },
        { $set: { "teacherProfile.center": req.params.id } }
      );
    }
    res.json({ center });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/centers/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    await Center.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// CLASS MANAGEMENT
// ==========================================
app.patch("/api/admin/classes/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const classRecord = await ClassModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ class: classRecord });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/classes/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    await ClassModel.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// CHILDREN MANAGEMENT
// ==========================================
app.patch("/api/admin/children/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const child = await Child.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ child });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/children/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    await Child.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// TEACHER MANAGEMENT
// ==========================================
app.patch("/api/admin/teachers/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { name, phone, email, teacherProfile } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (email) updateData.email = email;
    if (teacherProfile) {
      const existing = await User.findById(req.params.id);
      updateData.teacherProfile = {
        ...(existing?.teacherProfile || {}),
        ...teacherProfile
      };
    }
    const teacher = await User.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .select("-passwordHash")
      .populate("teacherProfile.center", "name city")
      .populate("teacherProfile.class", "name ageGroup");
    res.json({ teacher });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/teachers/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// COURSE MANAGEMENT
// ==========================================
app.patch("/api/courses/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ course });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/courses/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    await Course.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/courses/:id/assign", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { teacherId, dueDate } = req.body;
    const assignment = await CourseAssignment.findOneAndUpdate(
      { course: req.params.id, teacher: teacherId },
      { course: req.params.id, teacher: teacherId, assignedBy: req.user.id, dueDate, status: "assigned" },
      { upsert: true, new: true }
    );
    await Notification.create({
      recipient: teacherId,
      title: "New course assigned",
      body: "A training course has been assigned to your teacher portal.",
      status: "sent",
      sentAt: new Date(),
    });
    res.status(201).json({ assignment });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/courses/assignments", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const assignments = await CourseAssignment.find()
      .populate("course")
      .populate("teacher", "name email");
    res.json({ assignments });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/courses/assignments/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { status, feedback, score, rubric, trainer, notified, annotations } = req.body;
    const update = {};
    if (status !== undefined) update.status = status;
    if (feedback !== undefined) update.feedback = feedback;
    if (score !== undefined) update.score = score;
    if (rubric !== undefined) update.rubric = rubric;
    if (trainer !== undefined) update.trainer = trainer;
    if (notified !== undefined) update.notified = notified;
    if (annotations !== undefined) update.annotations = annotations;

    const assignment = await CourseAssignment.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    ).populate("course").populate("teacher", "name email");
    
    res.json({ assignment });
  } catch (error) {
    next(error);
  }
});


app.patch("/api/teacher/courses/assignments/:id", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const { progressPercent, completedContent, status } = req.body;
    const update = {};
    if (progressPercent !== undefined) update.progressPercent = progressPercent;
    if (completedContent) update.completedContent = completedContent;
    if (status) update.status = status;
    if (progressPercent === 100) {
      update.completedAt = new Date();
      update.status = "completed";
    }
    const assignment = await CourseAssignment.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user.id },
      update,
      { new: true }
    ).populate("course");
    res.json({ assignment });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// LESSON PLANS & ASSIGNMENTS
// ==========================================
app.get("/api/lesson-plans", requireAuth, async (req, res, next) => {
  try {
    const lessonPlans = await LessonPlan.find().populate("course", "title category level");
    res.json({ lessonPlans });
  } catch (error) {
    next(error);
  }
});

app.post("/api/lesson-plans", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const lessonPlan = await LessonPlan.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ lessonPlan });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/lesson-plans/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const lessonPlan = await LessonPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ lessonPlan });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/lesson-plans/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    await LessonPlan.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/lesson-plans/assign", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { lessonPlanId, teacherId, centerId, classId, assignedDate } = req.body;
    const assignment = await LessonPlanAssignment.create({
      lessonPlan: lessonPlanId,
      teacher: teacherId,
      center: centerId,
      class: classId,
      assignedDate: assignedDate || new Date(),
      status: "pending"
    });
    if (teacherId) {
      await Notification.create({
        recipient: teacherId,
        title: "New lesson plan assigned",
        body: "A lesson plan has been allocated to your classroom schedule.",
        status: "sent",
        sentAt: new Date(),
      });
    }
    res.status(201).json({ assignment });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/lesson-plans/assignments", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const assignments = await LessonPlanAssignment.find()
      .populate("lessonPlan")
      .populate("teacher", "name email")
      .populate("center", "name")
      .populate("class", "name");
    res.json({ assignments });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/lesson-plans/assignments/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { status } = req.body;
    const assignment = await LessonPlanAssignment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json({ assignment });
  } catch (error) {
    next(error);
  }
});


app.post("/api/teacher/lesson-plans/:id/complete", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const { teachingNotes, activityDescription, files } = req.body;
    const assignment = await LessonPlanAssignment.findOne({ _id: req.params.id, teacher: req.user.id });
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    assignment.status = "completed";
    await assignment.save();

    const report = await LessonCompletionReport.create({
      assignment: assignment._id,
      teacher: req.user.id,
      teachingNotes,
      activityDescription,
      files: files || [],
      status: "pending"
    });

    res.status(201).json({ report, assignment });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/lesson-plans/reports", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const reports = await LessonCompletionReport.find()
      .populate({
        path: "assignment",
        populate: [
          { path: "lessonPlan" },
          { path: "center", select: "name" },
          { path: "class", select: "name" }
        ]
      })
      .populate("teacher", "name email")
      .populate("files");
    res.json({ reports });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/lesson-plans/reports/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { status, adminFeedback } = req.body;
    const report = await LessonCompletionReport.findByIdAndUpdate(
      req.params.id,
      { status, adminFeedback, reviewedBy: req.user.id, reviewedAt: new Date() },
      { new: true }
    );
    res.json({ report });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// CLASSROOM ACTIVITIES
// ==========================================
app.get("/api/activities", requireAuth, async (req, res, next) => {
  try {
    const filter = req.user.role === "admin" ? {} : { teacher: req.user.id };
    const activities = await ActivitySubmission.find(filter)
      .populate("teacher", "name email")
      .populate("center", "name")
      .populate("class", "name")
      .populate("lessonPlan", "title")
      .populate("files")
      .sort({ createdAt: -1 });
    res.json({ activities });
  } catch (error) {
    next(error);
  }
});

app.post("/api/activities", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const { center, class: classId, lessonPlan, activityDate, description, files } = req.body;
    const activity = await ActivitySubmission.create({
      teacher: req.user.id,
      center,
      class: classId,
      lessonPlan,
      activityDate: activityDate || new Date(),
      description,
      files: files || [],
      status: "pending"
    });
    res.status(201).json({ activity });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/activities/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { status, adminComments } = req.body;
    const activity = await ActivitySubmission.findByIdAndUpdate(
      req.params.id,
      { status, adminComments, reviewedBy: req.user.id, reviewedAt: new Date() },
      { new: true }
    ).populate("teacher", "name");
    res.json({ activity });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// ATTENDANCE (CHILDREN & TEACHERS)
// ==========================================
app.get("/api/attendance/children", requireAuth, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.centerId) filter.center = req.query.centerId;
    if (req.query.classId) filter.class = req.query.classId;
    if (req.query.date) {
      const d = new Date(req.query.date);
      filter.attendanceDate = {
        $gte: new Date(d.setHours(0,0,0,0)),
        $lte: new Date(d.setHours(23,59,59,999))
      };
    }
    if (req.user.role === "teacher") {
      filter.teacher = req.user.id;
    }
    const sessions = await ChildAttendanceSession.find(filter)
      .populate("center", "name")
      .populate("class", "name")
      .populate("records.child", "fullName rollNo");
    res.json({ sessions });
  } catch (error) {
    next(error);
  }
});

app.post("/api/attendance/children", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const { centerId, classId, attendanceDate, records } = req.body;
    const dateVal = new Date(attendanceDate);
    dateVal.setHours(0,0,0,0);

    const formattedRecords = records.map(r => ({
      child: r.childId || r.child,
      status: r.status,
      note: r.note
    }));

    const session = await ChildAttendanceSession.findOneAndUpdate(
      { class: classId, attendanceDate: dateVal },
      {
        center: centerId,
        class: classId,
        teacher: req.user.id,
        attendanceDate: dateVal,
        records: formattedRecords,
        submittedAt: new Date()
      },
      { upsert: true, new: true }
    );
    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
});

app.get("/api/attendance/teachers", requireAuth, async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === "teacher") {
      filter.teacher = req.user.id;
    } else {
      if (req.query.teacherId) filter.teacher = req.query.teacherId;
    }
    if (req.query.date) {
      const d = new Date(req.query.date);
      filter.attendanceDate = {
        $gte: new Date(d.setHours(0,0,0,0)),
        $lte: new Date(d.setHours(23,59,59,999))
      };
    }
    const records = await TeacherAttendanceRecord.find(filter)
      .populate("teacher", "name email subject")
      .sort({ attendanceDate: -1 });
    res.json({ records });
  } catch (error) {
    next(error);
  }
});

app.post("/api/attendance/teachers", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const { status, source, latitude, longitude, note } = req.body;
    const today = new Date();
    today.setHours(0,0,0,0);

    const record = await TeacherAttendanceRecord.findOneAndUpdate(
      { teacher: req.user.id, attendanceDate: today },
      {
        teacher: req.user.id,
        attendanceDate: today,
        status: status || "present",
        source: source || "geo",
        latitude,
        longitude,
        note,
        markedBy: req.user.id
      },
      { upsert: true, new: true }
    );
    res.status(201).json({ record });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// TRAINERS & FEEDBACK
// ==========================================
app.get("/api/trainers", requireAuth, async (req, res, next) => {
  try {
    const trainers = await Trainer.find().sort({ createdAt: -1 });
    res.json({ trainers });
  } catch (error) {
    next(error);
  }
});

app.post("/api/trainers", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const trainer = await Trainer.create(req.body);
    res.status(201).json({ trainer });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/trainers/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const trainer = await Trainer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ trainer });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/trainers/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    await Trainer.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/feedbacks", requireAuth, async (req, res, next) => {
  try {
    const filter = req.user.role === "admin" ? {} : { anonymous: false };
    const feedbacks = await Feedback.find(filter).sort({ createdAt: -1 });
    res.json({ feedbacks });
  } catch (error) {
    next(error);
  }
});

app.post("/api/feedbacks", requireAuth, async (req, res, next) => {
  try {
    const feedback = await Feedback.create({
      ...req.body,
      learner: req.body.anonymous ? "Anonymous" : req.user.name,
      date: new Date().toLocaleDateString("en-IN")
    });
    res.status(201).json({ feedback });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/feedbacks/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const feedback = await Feedback.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ feedback });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// NOTIFICATIONS
// ==========================================
app.get("/api/notifications", requireAuth, async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id }).sort({ createdAt: -1 });
    res.json({ notifications });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/notifications/:id/read", requireAuth, async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { read: true, readAt: new Date() },
      { new: true }
    );
    res.json({ notification });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// ANALYTICS & REPORTS
// ==========================================
app.get("/api/admin/reports/analytics", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const [centersCount, teachersCount, childrenCount, pendingActivitiesCount, coursesCount, feedbacksCount, reportJobsCount] = await Promise.all([
      Center.countDocuments({ status: "active" }),
      User.countDocuments({ role: "teacher" }),
      Child.countDocuments({ status: "active" }),
      ActivitySubmission.countDocuments({ status: "pending" }),
      Course.countDocuments(),
      Feedback.countDocuments(),
      ReportJob.countDocuments()
    ]);
    res.json({
      totalCenters: centersCount,
      totalTeachers: teachersCount,
      totalChildren: childrenCount,
      pendingActivities: pendingActivitiesCount,
      totalCourses: coursesCount,
      totalFeedbacks: feedbacksCount,
      totalReportJobs: reportJobsCount
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/report-jobs", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const reportJobs = await ReportJob.find()
      .populate("createdBy", "name email")
      .populate("outputFile")
      .sort({ createdAt: -1 });

    res.json({ reportJobs });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/report-jobs", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const reportJob = await ReportJob.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ reportJob });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/report-jobs/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const reportJob = await ReportJob.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ reportJob });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  void _next;
  console.error(error);
  res.status(500).json({ message: "Server error", detail: error.message });
});

await connectDb();
await ensureDatabaseReady();

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
