import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { connectDb } from "./db.js";
import { createPasswordResetToken, hashPassword, requireAuth, requireRole, requirePermission, signToken, verifyPassword, verifyPasswordResetToken } from "./auth.js";
import { autoSeed } from "./auto-seed.js";
import { sendBulkEmails, sendEmail, getTwilioConfig } from "./email.js";
import courseAiRouter from "./routes/courseAi.js";
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
import { PortalSetting } from "./models/PortalSetting.js";
import { Batch } from "./models/Batch.js";
import { Certificate } from "./models/Certificate.js";
import { AssessmentResult } from "./models/AssessmentResult.js";
import { AttendanceAlert } from "./models/AttendanceAlert.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();
const port = process.env.PORT || 5000;
const databaseModels = [
  ActivitySubmission,
  AssessmentResult,
  AttendanceAlert,
  Batch,
  Center,
  Certificate,
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
  PortalSetting,
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
      try {
        await User.create({
          role: "admin",
          name: "System Administrator",
          email: adminEmail,
          phone: "9999999999",
          passwordHash: await hashPassword(adminPassword),
          status: "approved",
        });
        console.log(`Initial admin created: ${adminEmail}`);
      } catch (e) {
        if (e.code !== 11000) throw e;
      }
    }
  }
}

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5000",
  "http://localhost:5000",
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
        teacherProfile: user.teacherProfile,
        subject: user.teacherProfile?.subject,
        address: user.teacherProfile?.address,
        qualification: user.teacherProfile?.qualification,
        experience: user.teacherProfile?.experience,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/register-teacher", async (req, res, next) => {
  try {
    const { name, email, phone, password, qualification, subject, experience, address, center, class: classId } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "Name, email, phone, and password are required" });
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    const cleanEmail = String(email).toLowerCase().trim();
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address (e.g. teacher@school.com)" });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    // Validate phone (basic: at least 7 digits)
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 7) {
      return res.status(400).json({ message: "Please enter a valid phone number" });
    }

    const passwordHash = await hashPassword(password);

    const teacher = await User.create({
      role: "teacher",
      name: name.trim(),
      email: cleanEmail,
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
      return res.status(409).json({ message: "This email address is already registered. Please use a different email." });
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

app.get("/api/admin/users", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    const users = await User.find(filter)
      .select("-passwordHash")
      .sort({ createdAt: -1 });
    res.json({ users });
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
      const assignmentsAgg = await CourseAssignment.aggregate([
        { 
          $group: { 
            _id: "$course", 
            assignedCount: { $sum: 1 }, 
            completedCount: { $sum: { $cond: [{ $in: ["$status", ["completed", "reviewed"]] }, 1, 0] } 
          } 
        }
      ]);
      const assignmentMap = new Map(assignmentsAgg.map(a => [String(a._id), { assignedCount: a.assignedCount, completedCount: a.completedCount }]));
      
      const courses = await Course.find().sort({ createdAt: -1 });
      const coursesWithStats = courses.map(course => ({
        ...course.toObject(),
        assignedCount: assignmentMap.get(String(course._id))?.assignedCount || 0,
        completedCount: assignmentMap.get(String(course._id))?.completedCount || 0
      }));
      return res.json({ courses: coursesWithStats });
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

app.post("/api/auth/forgot-password", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email }).select("_id email");
    const response = {
      success: true,
      message: "If the account exists, a password reset link has been generated.",
    };

    if (!user) {
      return res.json(response);
    }

    const resetToken = createPasswordResetToken(user.email);
    res.json({
      ...response,
      resetToken,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/reset-password/verify", async (req, res, next) => {
  try {
    const token = String(req.body.token || "");
    if (!token) {
      return res.status(400).json({ message: "Reset token is required" });
    }

    const payload = verifyPasswordResetToken(token);
    const user = await User.findOne({ email: payload.email }).select("email");

    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }

    res.json({ valid: true, email: user.email });
  } catch (error) {
    res.status(400).json({ message: "Reset link is invalid or expired" });
  }
});

app.post("/api/auth/reset-password", async (req, res, next) => {
  try {
    const token = String(req.body.token || "");
    const password = String(req.body.password || "");

    if (!token || !password) {
      return res.status(400).json({ message: "Reset token and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    const payload = verifyPasswordResetToken(token);
    const user = await User.findOne({ email: payload.email });

    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }

    user.passwordHash = await hashPassword(password);
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    res.status(400).json({ message: "Reset link is invalid or expired" });
  }
});

app.get("/api/admin/notifications", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const notifications = await Notification.find()
      .populate("recipient", "name email status")
      .sort({ createdAt: -1 })
      .limit(500);
    res.json({ notifications });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/notifications/broadcast", requireAuth, requireRole("admin"), async (req, res, next) => {
   try {
    const {
      subject,
      body,
      channel = "in_app",
      audience = "all",
      teacherIds = [],
      scheduledFor,
      idempotencyKey,
      isRetry,
      originalNotificationId,
    } = req.body;

    if (!subject || !body) {
      return res.status(400).json({ message: "Subject and message are required" });
    }

    let filter = { role: "teacher" };
    if (Array.isArray(teacherIds) && teacherIds.length > 0) {
      filter._id = { $in: teacherIds };
    } else if (audience === "approved") {
      filter.status = "approved";
    } else if (audience === "pending") {
      filter.status = "pending";
    }

    const recipients = await User.find(filter).select("_id name email phone status");

    if (recipients.length === 0) {
      return res.status(200).json({ notifications: [], recipientCount: 0 });
    }

    const meta = { subject, priority: "normal", category: "system" };
    const now = new Date();

    // Handle retry - update original notification instead of creating new ones
    if (isRetry && originalNotificationId) {
      const originalNotif = await Notification.findById(originalNotificationId);
      if (originalNotif && originalNotif.status === "failed") {
        originalNotif.status = "delivered";
        originalNotif.error = null;
        originalNotif.read = false;
        originalNotif.readAt = null;
        await originalNotif.save();
        return res.status(200).json({ notifications: [originalNotif], recipientCount: 1 });
      }
    }

    const buildDoc = (recipientId, notifChannel, notifStatus, opts = {}) => ({
      recipient: recipientId,
      channel: notifChannel,
      title: subject,
      body,
      status: notifStatus,
      metadata: meta,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : (notifStatus === "scheduled" ? now : undefined),
      sentAt: opts.sentAt || (notifStatus === "delivered" || notifStatus === "sent" ? now : undefined),
      error: opts.error || null,
    });

    // For in_app channel, just create notification documents
    if (channel === "in_app") {
      const docs = recipients.map((teacher) => buildDoc(teacher._id, "in_app", "delivered"));
      const notifications = await Notification.insertMany(docs);
      return res.status(201).json({ notifications, recipientCount: recipients.length });
    }

    // For email channel, actually send via SMTP
    if (channel === "email") {
      const emailResults = await sendBulkEmails({
        recipients: recipients.map((r) => ({ _id: r._id, email: r.email, name: r.name })),
        subject,
        body,
      });

      const docs = emailResults.map((result) => buildDoc(result.recipientId, "email", result.success ? "delivered" : "failed", { error: result.error || null, sentAt: result.success ? now : undefined }));
      const notifications = docs.length ? await Notification.insertMany(docs) : [];
      const failedCount = emailResults.filter((r) => !r.success).length;

      return res.status(201).json({
        notifications,
        recipientCount: recipients.length,
        delivered: recipients.length - failedCount,
        failed: failedCount,
      });
    }

    // SMS and WhatsApp via Twilio (if configured)
    if (channel === "sms" || channel === "whatsapp") {
      const twilioConf = await getTwilioConfig();

      if (!twilioConf) {
        const docs = recipients.map((teacher) => buildDoc(teacher._id, channel, "failed", { error: `${channel.toUpperCase()} provider is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER to your .env file.` }));
        const notifications = docs.length ? await Notification.insertMany(docs) : [];
        return res.status(501).json({
          notifications,
          recipientCount: recipients.length,
          delivered: 0,
          failed: recipients.length,
          message: `${channel.toUpperCase()} provider not configured.`,
        });
      }

      const twilioBase = `https://api.twilio.com/2010-04-01/Accounts/${twilioConf.sid}/Messages.json`;
      const messageResults = await Promise.allSettled(
        recipients.map(async (r) => {
          if (!r.phone) return { recipientId: r._id, success: false, error: "No phone number on record" };
          const cleanPhone = r.phone.replace(/\s+/g, "");
          const toNumber = channel === "whatsapp" ? `whatsapp:${cleanPhone}` : cleanPhone;
          const fromNumber = channel === "whatsapp" ? `whatsapp:${twilioConf.from}` : twilioConf.from;
          const resp = await fetch(twilioBase, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: "Basic " + Buffer.from(`${twilioConf.sid}:${twilioConf.token}`).toString("base64"),
            },
            body: new URLSearchParams({ To: toNumber, From: fromNumber, Body: `${subject}\n\n${body}` }).toString(),
          });
          const data = await resp.json();
          if (!resp.ok) return { recipientId: r._id, success: false, error: data.message || "Twilio error" };
          return { recipientId: r._id, success: true };
        })
      );

      const results = messageResults.map((r) =>
        r.status === "fulfilled" ? r.value : { recipientId: null, success: false, error: r.reason?.message }
      );
      const docs = results.map((result, i) => buildDoc(result.recipientId || recipients[i]?._id, channel, result.success ? "delivered" : "failed", { error: result.error || null }));
      const notifications = docs.length ? await Notification.insertMany(docs) : [];
      const failedCount = results.filter((r) => !r.success).length;
      return res.status(201).json({
        notifications,
        recipientCount: recipients.length,
        delivered: recipients.length - failedCount,
        failed: failedCount,
      });
    }

    const docs = recipients.map((teacher) => buildDoc(teacher._id, channel, "delivered"));
    const notifications = docs.length ? await Notification.insertMany(docs) : [];
    res.status(201).json({ notifications, recipientCount: recipients.length });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/teacher/me", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const { name, phone, photoUrl, teacherProfile = {} } = req.body;
    const allowedProfileFields = ["qualification", "subject", "experience", "address"];
    const update = {};

    if (name !== undefined) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (photoUrl !== undefined) update.photoUrl = photoUrl;

    for (const field of allowedProfileFields) {
      if (teacherProfile[field] !== undefined) {
        update[`teacherProfile.${field}`] = teacherProfile[field];
      }
    }

    const teacher = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true })
      .select("-passwordHash")
      .populate("teacherProfile.center", "name address city pincode contactPerson phone email")
      .populate("teacherProfile.class", "name ageGroup curriculumLevel schedule");

    res.json({ teacher });
  } catch (error) {
    next(error);
  }
});

app.post("/api/teacher/change-password", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters long" });
    }

    const user = await User.findById(req.user.id).select("passwordHash");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const newPasswordHash = await hashPassword(newPassword);
    await User.findByIdAndUpdate(req.user.id, { $set: { passwordHash: newPasswordHash } });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
});

app.get("/api/teacher/classes", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const teacher = await User.findById(req.user.id).select("teacherProfile");
    const centerId = teacher?.teacherProfile?.center;

    if (!centerId) {
      return res.json({ classes: [] });
    }

    const classes = await ClassModel.find({ center: centerId }).sort({ name: 1 });
    res.json({ classes });
  } catch (error) {
    next(error);
  }
});

app.get("/api/teacher/children", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const teacher = await User.findById(req.user.id).select("teacherProfile");
    const classId = req.query.classId || teacher?.teacherProfile?.class;
    const centerId = teacher?.teacherProfile?.center;

    if (!classId && !centerId) {
      return res.json({ children: [] });
    }

    const filter = {};
    if (classId) {
      filter.class = classId;
    } else {
      filter.center = centerId;
    }
    filter.status = "active";

    const children = await Child.find(filter)
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
    const classId = req.body.classId || teacher?.teacherProfile?.class;

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
    const teacher = await User.findById(req.user.id).select("teacherProfile.class teacherProfile.center");
    const classId = teacher?.teacherProfile?.class;
    const centerId = teacher?.teacherProfile?.center;

    let totalChildrenQuery = { status: "active" };
    if (classId) {
      totalChildrenQuery.class = classId;
    } else if (centerId) {
      totalChildrenQuery.center = centerId;
    } else {
      totalChildrenQuery = null;
    }

    const lessonFilter = {
      $or: [
        { teacher: req.user.id }
      ]
    };
    if (centerId) lessonFilter.$or.push({ center: centerId });
    if (classId) lessonFilter.$or.push({ class: classId });

    const [courses, lessons, activities, attendance, totalChildren] = await Promise.all([
      CourseAssignment.find({ teacher: req.user.id }).populate("course"),
      LessonPlanAssignment.find(lessonFilter).populate("lessonPlan", "title scheduleDate"),
      ActivitySubmission.find({ teacher: req.user.id }).sort({ activityDate: -1 }),
      TeacherAttendanceRecord.find({ teacher: req.user.id }).sort({ attendanceDate: -1 }),
      totalChildrenQuery ? Child.countDocuments(totalChildrenQuery) : 0,
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
        totalChildren,
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

app.get("/api/trainer/me", requireAuth, requireRole("trainer"), async (req, res, next) => {
  try {
    const trainer = await User.findById(req.user.id)
      .select("-passwordHash")
      .populate("trainerProfile.centers", "name address city")
      .populate("trainerProfile.batches", "name course center");
    res.json({ trainer });
  } catch (error) {
    next(error);
  }
});

app.get("/api/trainer/batches", requireAuth, requireRole("trainer"), async (req, res, next) => {
  try {
    const trainer = await User.findById(req.user.id).select("trainerProfile.batches");
    const batchIds = trainer?.trainerProfile?.batches || [];
    const batches = await CourseAssignment.find({ _id: { $in: batchIds } })
      .populate("course", "title category level")
      .populate("teacher", "name email");
    res.json({ batches });
  } catch (error) {
    next(error);
  }
});

app.get("/api/trainer/teachers", requireAuth, requireRole("trainer"), async (req, res, next) => {
  try {
    const trainer = await User.findById(req.user.id).select("trainerProfile.batches");
    const batchIds = trainer?.trainerProfile?.batches || [];
    const assignments = await CourseAssignment.find({ _id: { $in: batchIds } })
      .populate("teacher", "name email teacherProfile");
    const teacherIds = [...new Set(assignments.map(a => a.teacher?._id).filter(Boolean))];
    const teachers = await User.find({ _id: { $in: teacherIds }, role: "teacher" }).select("name email teacherProfile status");
    res.json({ teachers });
  } catch (error) {
    next(error);
  }
});

app.post("/api/trainer/assignments", requireAuth, requireRole("trainer"), async (req, res, next) => {
  try {
    const { title, description, courseId, batchId, dueDate, maxScore } = req.body;
    if (!title || !description || !courseId) {
      return res.status(400).json({ message: "Title, description, and course are required" });
    }
    const assignment = await CourseAssignment.create({
      title,
      description,
      course: courseId,
      teacher: req.user.id,
      trainer: req.user.id,
      batch: batchId,
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "assigned",
      maxScore: maxScore || 100,
    });
    res.status(201).json({ assignment });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/trainer/assignments/:id/review", requireAuth, requireRole("trainer"), async (req, res, next) => {
  try {
    const { score, feedback, status } = req.body;
    const update = {};
    if (score !== undefined) update.score = Math.max(0, Math.min(100, Number(score)));
    if (feedback !== undefined) update.feedback = feedback;
    if (status) update.status = status;
    if (status === "reviewed" || status === "approved") update.reviewedAt = new Date();
    
    const assignment = await CourseAssignment.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate("course", "title")
      .populate("teacher", "name email");
    
    if (assignment && assignment.teacher?._id) {
      await Notification.create({
        recipient: assignment.teacher._id,
        title: "Assignment Reviewed",
        body: `Your assignment "${assignment.title}" has been reviewed. Score: ${assignment.score}/100`,
        status: "delivered",
        sentAt: new Date(),
      });
    }
    
    res.json({ assignment });
  } catch (error) {
    next(error);
  }
});

app.get("/api/trainer/attendance/summary", requireAuth, requireRole("trainer"), async (req, res, next) => {
  try {
    const trainer = await User.findById(req.user.id).select("trainerProfile.batches");
    const batchIds = trainer?.trainerProfile?.batches || [];
    const assignments = await CourseAssignment.find({ _id: { $in: batchIds } });
    const teacherIds = [...new Set(assignments.map(a => a.teacher?._id).filter(Boolean))];
    
    const attendanceRecords = await TeacherAttendanceRecord.find({ teacher: { $in: teacherIds } })
      .populate("teacher", "name email")
      .sort({ attendanceDate: -1 });
    
    const summary = {};
    for (const teacherId of teacherIds) {
      const records = attendanceRecords.filter(r => String(r.teacher) === String(teacherId));
      const total = records.length;
      const present = records.filter(r => r.status === "present").length;
      const late = records.filter(r => r.status === "late").length;
      summary[teacherId] = {
        teacherId,
        totalRecords: total,
        present,
        late,
        absent: total - present - late,
        attendanceRate: total ? Math.round(((present + late * 0.5) / total) * 100) : 0
      };
    }
    res.json({ summary });
  } catch (error) {
    next(error);
  }
});

app.get("/api/trainer/performance", requireAuth, requireRole("trainer"), async (req, res, next) => {
  try {
    const trainer = await User.findById(req.user.id).select("trainerProfile.batches");
    const batchIds = trainer?.trainerProfile?.batches || [];
    const assignments = await CourseAssignment.find({ _id: { $in: batchIds } });
    const teacherIds = [...new Set(assignments.map(a => a.teacher?._id).filter(Boolean))];
    
    const reviewed = await CourseAssignment.find({
      _id: { $in: batchIds },
      score: { $ne: null }
    }).populate("teacher", "name email");
    
    const stats = {};
    for (const teacherId of teacherIds) {
      const teacherAssignments = reviewed.filter(a => String(a.teacher?._id) === String(teacherId));
      const scores = teacherAssignments.map(a => a.score).filter(s => s !== null && s !== undefined);
      stats[teacherId] = {
        teacherId,
        totalAssignments: teacherAssignments.length,
        reviewedAssignments: teacherAssignments.filter(a => a.status === "reviewed" || a.status === "approved").length,
        averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
        bestScore: scores.length ? Math.max(...scores) : 0,
      };
    }
    res.json({ stats });
  } catch (error) {
    next(error);
  }
});

app.get("/api/teacher/assessment-results", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    res.json({ results: [] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/teacher/lesson-plans", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const teacher = await User.findById(req.user.id).select("teacherProfile");
    const centerId = teacher?.teacherProfile?.center;
    const classId = teacher?.teacherProfile?.class;

    const filter = {
      $or: [
        { teacher: req.user.id }
      ]
    };
    if (centerId) {
      filter.$or.push({ center: centerId });
    }
    if (classId) {
      filter.$or.push({ class: classId });
    }

    const lessonPlans = await LessonPlanAssignment.find(filter)
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
app.use("/uploads", cors(), express.static(uploadDir));

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

// ==========================================
// DIRECT MESSAGE TO SPECIFIC TEACHER
// ==========================================
app.post("/api/admin/teachers/:id/message", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { subject, body, channel = "in_app" } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ message: "Subject and message body are required" });
    }

    const teacher = await User.findOne({ _id: req.params.id, role: "teacher" }).select("_id name email phone");
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    // Create in-app notification always
    const notification = await Notification.create({
      recipient: teacher._id,
      channel: "in_app",
      title: subject,
      body,
      status: "delivered",
      sentAt: new Date(),
    });

    // If email channel requested, also send email
    if (channel === "email") {
      await sendEmail({ to: teacher.email, subject, html: body.replace(/\n/g, "<br>") });
    }

    res.status(201).json({ notification, recipientName: teacher.name });
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

// AI Course Generation (mounted router with auth + admin middleware)
app.use("/api/courses", requireAuth, requireRole("admin"), courseAiRouter);

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
    const { progressPercent, completedContent, status, title, feedback, submissionFiles } = req.body;
    const update = {};
    if (progressPercent !== undefined) update.progressPercent = progressPercent;
    if (completedContent) update.completedContent = completedContent.map(String);
    if (status) update.status = status;
    if (title !== undefined) update.title = title;
    if (feedback !== undefined) update.feedback = feedback;
    if (submissionFiles !== undefined) update.submissionFiles = submissionFiles;
    if (status === "submitted") update.submittedAt = new Date();
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
// ACTIVITIES MANAGEMENT
// ==========================================
app.post("/api/teacher/lesson-plans/:id/complete", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const { teachingNotes, activityDescription, files } = req.body;
    const assignment = await LessonPlanAssignment.findOne({ _id: req.params.id, teacher: req.user.id });
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    assignment.status = "completed";
    await assignment.save();

    const report = await LessonCompletionRepor