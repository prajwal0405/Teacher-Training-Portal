import express from "express";
import jwt from "jsonwebtoken";
import http from "http";
import net from "net";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import mongoose from "mongoose";
import { connectDb } from "./db.js";
import { hashPassword, requireAuth, requireRole, signToken, verifyPassword, validatePasswordAgainstPolicy, createPasswordResetToken, verifyPasswordResetToken } from "./auth.js";
import { generateOtp, storeOtp, verifyOtp, deleteOtp, OTP_TTL_MINUTES } from "./otp.js";
import { sendNotification, broadcastNotification, CHANNELS, TEMPLATES } from "./services/notificationService.js";
import { autoSeed } from "./auto-seed.js";
import { generateAICourse } from "./services/aiCourseGenerator.js";
import { User } from "./models/User.js";
import { Center } from "./models/Center.js";
import { ClassModel } from "./models/Class.js";
import { ClassLog } from "./models/ClassLog.js";
import { Child } from "./models/Child.js";
import { Course } from "./models/Course.js";
import { CourseAssignment } from "./models/CourseAssignment.js";
import { Note } from "./models/Note.js";
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
import { TrainerMessage } from "./models/TrainerMessage.js";
import { TrainerPayout } from "./models/TrainerPayout.js";
import { sendBulkEmails, sendEmail, getTwilioConfig } from "./email.js";
import { initSocket, createAndEmitNotification } from "./socket.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();
const port = process.env.PORT || 5000;
const databaseModels = [
   ActivitySubmission,
   Center,
   ChildAttendanceSession,
   Child,
   ClassLog,
   ClassModel,
   CourseAssignment,
   Course,
   Feedback,
   FileAsset,
   LessonCompletionReport,
   LessonPlan,
   LessonPlanAssignment,
   Note,
   Notification,
   PortalSetting,
   ReportJob,
   TeacherAttendanceRecord,
   Trainer,
   TrainerMessage,
   TrainerPayout,
   User,
  ];

function isPresentObjectId(value) {
  return value !== undefined && value !== null && value !== "" && value !== "undefined" && mongoose.isValidObjectId(value);
}

function requireObjectId(value, fieldName) {
  if (!isPresentObjectId(value)) {
    const err = new Error(`${fieldName} must be a valid id.`);
    err.status = 400;
    throw err;
  }
}

function objectIdFilter(queryValue, fieldName) {
  if (queryValue === undefined || queryValue === null || queryValue === "" || queryValue === "undefined") {
    return null;
  }
  requireObjectId(queryValue, fieldName);
  return queryValue;
}

function normalizePhoneE164(phone, defaultCountryCode = "91") {
  if (!phone) return phone;
  let cleaned = phone.replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.length === 10) return `+${defaultCountryCode}${cleaned}`;
  if (cleaned.length > 10) return `+${cleaned}`;
  return cleaned;
}

function mapFormModulesToCourse(modules = []) {
  return (Array.isArray(modules) ? modules : []).map((module, moduleIndex) => ({
    title: module.title || `Module ${moduleIndex + 1}`,
    order: module.order || moduleIndex + 1,
    description: module.description || "",
    learningOutcomes: module.learningOutcomes || [],
    detailedNotes: module.detailedNotes || "",
    keyTakeaways: module.keyTakeaways || [],
    assessments: module.assessments || undefined,
    studyMaterials: module.studyMaterials || undefined,
    contents: (module.contents || module.lessons || []).map((lesson, lessonIndex) => ({
      title: lesson.title || `Lesson ${lessonIndex + 1}`,
      type: lesson.type === "reading" ? "document" : lesson.type || "video",
      externalUrl: lesson.externalUrl || lesson.videoUrl || lesson.url || "",
      description: lesson.description || lesson.notes || "",
      detailedLearningContent: lesson.detailedLearningContent || lesson.content || "",
      practicalExamples: lesson.practicalExamples || [],
      suggestedDuration: lesson.suggestedDuration || lesson.duration || "",
      durationMinutes: lesson.durationMinutes || Number.parseInt(lesson.duration, 10) || undefined,
      videoTitle: lesson.videoTitle || "",
      notes: lesson.notes || lesson.detailedLearningContent || lesson.description || "",
      order: lesson.order || lessonIndex + 1,
      isRequired: lesson.isRequired ?? true,
    })),
  }));
}

function normalizeCoursePayload(payload, userId) {
  return {
    ...payload,
    createdBy: userId,
    modules: mapFormModulesToCourse(payload.modules),
  };
}

async function createCourseWithNotes(coursePayload, notesPayload, createdBy) {
  const course = await Course.create(coursePayload);
  try {
    const notes = Array.isArray(notesPayload) && notesPayload.length
      ? await Note.insertMany(notesPayload.map((note) => ({
          title: note.title,
          content: note.content,
          moduleIndex: note.moduleIndex,
          contentIndex: note.contentIndex,
          fileUrl: note.fileUrl,
          fileName: note.fileName,
          fileSize: note.fileSize,
          mimeType: note.mimeType,
          course: course._id,
          createdBy,
        })))
      : [];
    console.log("[course-save] created", JSON.stringify({ courseId: course._id, notes: notes.length }));
    return { course, notes };
  } catch (error) {
    await Course.findByIdAndDelete(course._id);
    console.error("[course-save] rolled_back", JSON.stringify({ courseId: course._id, error: error.message }));
    throw error;
  }
}

async function ensureDatabaseReady() {
  for (const model of databaseModels) {
    try {
      await model.createCollection();
      await model.syncIndexes();
    } catch (error) {
      if (error.code === 11000 || error.code === 11001) {
        console.warn(`Index sync skipped for ${model.modelName} due to duplicate data.`);
      } else {
        throw error;
      }
    }
  }

  const teacherCount = await User.countDocuments({ role: "teacher" });
  if (teacherCount === 0) {
    try {
      await autoSeed();
    } catch (error) {
      console.warn("Auto-seed encountered an issue (data may already exist):", error.message);
    }
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

const bypassRoutes = [
  "/health",
  "/api/auth/login",
  "/api/auth/register-teacher",
  "/api/auth/forgot-password",
  "/api/auth/forgot-password-otp",
  "/api/auth/verify-otp",
  "/api/auth/reset-password",
  "/api/auth/reset-password/verify"
];

app.use(async (req, res, next) => {
  // Allow health check, login, register, reset-password, and static uploads
  if (bypassRoutes.includes(req.path) || req.path.startsWith("/uploads/") || req.path.startsWith("/assets/")) {
    return next();
  }

  try {
    const maintenanceDoc = await PortalSetting.findOne({ key: "maintenanceMode" });
    const isMaintenance = maintenanceDoc ? (maintenanceDoc.value === true || maintenanceDoc.value === "true") : false;

    if (isMaintenance) {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
      let userRole = null;
      if (token) {
        try {
          const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "dev_access_secret_change_me");
          userRole = payload.role;
        } catch (e) {
          // Token invalid, let it pass to requireAuth middleware to handle normally
        }
      }

      if (userRole !== "admin" && userRole !== "super_admin") {
        return res.status(503).json({ message: "The portal is currently undergoing maintenance. Please try again later." });
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

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
        photoUrl: user.photoUrl,
        language: user.language || "English",
        preferredNotificationChannel: user.preferredNotificationChannel || "in_app",
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
    const { name, email, phone, password, qualification, subject, experience, address, center, class: classId, classIds } = req.body;
    
    const policyResult = await validatePasswordAgainstPolicy(password);
    if (!policyResult.valid) {
      return res.status(400).json({ message: policyResult.message });
    }

    const passwordHash = await hashPassword(password);

    let assignedClasses = classIds || [];
    if (classId && !classIds) {
      assignedClasses = [classId];
    }
    // Don't auto-assign all classes when only center is provided
    // Teachers should only get classes that are explicitly assigned to them

    const teacher = await User.create({
      role: "teacher",
      name,
      email,
      phone,
      passwordHash,
      status: "pending",
      teacherProfile: { qualification, subject, experience, address, center, class: classId, classes: assignedClasses },
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

    const policyResult = await validatePasswordAgainstPolicy(password);
    if (!policyResult.valid) {
      return res.status(400).json({ message: policyResult.message });
    }

    const payload = verifyPasswordResetToken(token);
    const user = await User.findOne({ email: payload.email });

    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }

    user.passwordHash = await hashPassword(password);
    user.passwordChangedAt = new Date();
    // Set password expiry based on policy
    const expiryDoc = await PortalSetting.findOne({ key: "passwordExpiryDays" });
    const expiryDays = expiryDoc ? Number(expiryDoc.value) : 90;
    if (expiryDays > 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);
      user.passwordExpiresAt = expiresAt;
    } else {
      user.passwordExpiresAt = null;
    }
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    res.status(400).json({ message: "Reset link is invalid or expired" });
  }
});

// ==========================================
// OTP-BASED PASSWORD RESET (SHA-256 + In-Memory)
// ==========================================
app.post("/api/auth/forgot-password-otp", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email }).select("_id email name");
    // Always return success to prevent email enumeration
    const successResponse = {
      success: true,
      message: "If the account exists, a 6-digit OTP has been sent to your email.",
      otpExpiryMinutes: OTP_TTL_MINUTES,
    };

    if (!user) {
      return res.json(successResponse);
    }

    // Generate 6-digit OTP
    const otp = generateOtp();
    // Store hashed OTP in memory
    storeOtp(email, otp);

    // Send OTP via email
    const emailResult = await sendEmail({
      to: user.email,
      subject: "SpacECE Portal — Password Reset OTP",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px;">
          <div style="text-align:center;margin-bottom:24px;">
            <h2 style="color:#f59e0b;margin:0;">🔐 Password Reset</h2>
            <p style="color:#6b7280;font-size:14px;margin-top:8px;">SpacECE Teacher Training Portal</p>
          </div>
          <div style="background:white;border-radius:12px;padding:24px;text-align:center;border:2px dashed #fbbf24;">
            <p style="color:#374151;font-size:14px;margin:0 0 12px;">Hello <strong>${user.name || "User"}</strong>,</p>
            <p style="color:#6b7280;font-size:13px;margin:0 0 20px;">Your 6-digit One-Time Password (OTP) is:</p>
            <div style="font-size:36px;font-weight:900;color:#f59e0b;letter-spacing:12px;margin:16px 0;background:#fef3c7;padding:16px;border-radius:10px;">${otp}</div>
            <p style="color:#9ca3af;font-size:12px;margin:16px 0 0;">This OTP expires in <strong>${OTP_TTL_MINUTES} minutes</strong>.</p>
            <p style="color:#9ca3af;font-size:12px;margin:4px 0 0;">Do not share this code with anyone.</p>
          </div>
          <p style="color:#d1d5db;font-size:11px;text-align:center;margin-top:20px;">
            If you didn't request this, please ignore this email.<br/>
            Sent at ${new Date().toLocaleString("en-IN")} · SpacECE Portal
          </p>
        </div>
      `,
    });

    console.log("[otp] generated_and_sent", JSON.stringify({
      email,
      emailSent: emailResult.success,
      otpLength: otp.length,
    }));

    res.json({
      ...successResponse,
      emailSent: emailResult.success,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/verify-otp", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    const otp = String(req.body.otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "OTP must be a 6-digit number" });
    }

    const result = verifyOtp(email, otp);

    if (!result.valid) {
      const messages = {
        no_otp: "No OTP found. Please request a new one.",
        expired: "OTP has expired. Please request a new one.",
        rate_limited: "Too many attempts. Please request a new OTP.",
        invalid: `Invalid OTP. ${result.attemptsLeft || 0} attempts remaining.`,
      };
      return res.status(400).json({ message: messages[result.reason] || "Invalid OTP" });
    }

    // OTP verified — generate a short-lived reset token
    const resetToken = createPasswordResetToken(email);

    console.log("[otp] verified", JSON.stringify({ email }));

    res.json({
      success: true,
      message: "OTP verified successfully. You can now set a new password.",
      resetToken,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/teacher/change-password", requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    const policyResult = await validatePasswordAgainstPolicy(newPassword);
    if (!policyResult.valid) {
      return res.status(400).json({ message: policyResult.message });
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
    const updateData = { passwordHash: newPasswordHash, passwordChangedAt: new Date() };
    // Set password expiry based on policy
    const expiryDoc = await PortalSetting.findOne({ key: "passwordExpiryDays" });
    const expiryDays = expiryDoc ? Number(expiryDoc.value) : 90;
    if (expiryDays > 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);
      updateData.passwordExpiresAt = expiresAt;
    } else {
      updateData.passwordExpiresAt = null;
    }
    await User.findByIdAndUpdate(req.user.id, { $set: updateData });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
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
    const { teachers = [], classes: classesPayload = [], ...centerPayload } = req.body;
    const center = await Center.create(centerPayload);

    // Create classes for this center and track teacher-class assignments
    const createdClasses = [];
    const teacherClassMap = {}; // { teacherId: [classId, ...] }
    const assignmentErrors = [];

    for (const cls of classesPayload) {
      const { teacherId, ...classData } = cls;
      const classRecord = await ClassModel.findOneAndUpdate(
        { center: center._id, name: classData.name },
        { center: center._id, ...classData },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      createdClasses.push(classRecord);

      // Map teacher to this class (multiple teachers per class allowed)
      if (teacherId) {
        // Check for cross-center assignment warnings
        const existingUser = await User.findOne({
          _id: teacherId,
          role: "teacher",
        }).select("_id name teacherProfile.center teacherProfile.classes");

        if (existingUser && existingUser.teacherProfile?.center) {
          const existingCenterId = String(existingUser.teacherProfile.center);
          if (existingCenterId !== String(center._id)) {
            // Teacher is assigned to a different center — emit a warning
            assignmentErrors.push({
              teacherId,
              teacherName: existingUser.name,
              className: classData.name,
              message: `Teacher "${existingUser.name}" is already assigned to another center. Please verify schedule conflicts and travel feasibility.`,
              type: "cross_center_warning",
            });
          }
        }

        if (!teacherClassMap[teacherId]) teacherClassMap[teacherId] = [];
        teacherClassMap[teacherId].push(classRecord._id);
      }
    }

    // Assign teachers to center and their respective classes (warnings are non-blocking)
    if (teachers.length) {
      if (classesPayload.length > 0 && Object.keys(teacherClassMap).length > 0) {
        for (const [teacherId, classIds] of Object.entries(teacherClassMap)) {
          // Merge new classes with existing classes to support multi-center assignments
          const existingUser = await User.findById(teacherId).select("teacherProfile.classes");
          const existingClassIds = (existingUser?.teacherProfile?.classes || []).map(String);
          const mergedClassIds = [...new Set([...existingClassIds, ...classIds.map(String)])];

          await User.findByIdAndUpdate(teacherId, {
            $set: {
              "teacherProfile.center": center._id,
              "teacherProfile.classes": mergedClassIds,
            },
          });
        }
        // For teachers without specific class assignments, only set the center
        const teachersWithClasses = Object.keys(teacherClassMap);
        const teachersWithoutClasses = teachers.filter(t => !teachersWithClasses.includes(t));
        if (teachersWithoutClasses.length > 0) {
          await User.updateMany(
            { _id: { $in: teachersWithoutClasses }, role: "teacher" },
            { $set: { "teacherProfile.center": center._id } }
          );
        }
      } else {
        // No specific class assignments - only set the center
        await User.updateMany(
          { _id: { $in: teachers }, role: "teacher" },
          { $set: { "teacherProfile.center": center._id } }
        );
      }
    }

    // Return center with any cross-center warnings (non-blocking)
    const crossCenterWarnings = assignmentErrors.filter(e => e.type === "cross_center_warning");
    if (crossCenterWarnings.length > 0) {
      return res.status(201).json({
        center,
        classes: createdClasses,
        warnings: crossCenterWarnings,
        message: `Center created. Note: ${crossCenterWarnings.map(e => e.message).join("; ")}`,
      });
    }

    res.status(201).json({ center, classes: createdClasses });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/teachers", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const teachers = await User.find({ role: "teacher" })
      .select("-passwordHash")
      .populate("teacherProfile.center", "name city")
      .populate("teacherProfile.classes", "name ageGroup curriculumLevel schedule")
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
    const centerId = objectIdFilter(req.query.centerId, "centerId");
    const classId = objectIdFilter(req.query.classId, "classId");
    if (centerId) filter.center = centerId;
    if (classId) filter.class = classId;

    const children = await Child.find(filter)
      .populate("center", "name city")
      .populate("class", "name ageGroup")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({ children });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/children", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const centerId = req.body.centerId || req.body.center;
    const classId = req.body.classId || req.body.class;
    if (!centerId || centerId === "undefined" || centerId === "") {
      return res.status(400).json({ message: "Please select a center for the child." });
    }
    if (!classId || classId === "undefined" || classId === "") {
      return res.status(400).json({ message: "Please select a class for the child." });
    }
    requireObjectId(centerId, "center");
    requireObjectId(classId, "class");
    const childPayload = { ...req.body };
    delete childPayload.centerId;
    delete childPayload.classId;
    const child = await Child.create({
      ...childPayload,
      center: centerId,
      class: classId,
      rollNo: req.body.rollNo || await getNextChildRollNo(classId),
      status: req.body.status || "active",
      age: req.body.age || undefined,
      gender: req.body.gender || undefined,
      email: req.body.email || undefined,
      createdBy: req.user.id,
    });
    res.status(201).json({ child });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "A child with this roll number already exists in this class. Please try again." });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    if (error.status === 400) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

app.get("/api/courses", requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === "admin") {
      const [courses, assignmentStats] = await Promise.all([
        Course.find().sort({ createdAt: -1 }),
        CourseAssignment.aggregate([
          {
            $group: {
              _id: "$course",
              assignedCount: { $sum: 1 },
              completedCount: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $eq: ["$status", "completed"] },
                        { $eq: ["$status", "approved"] },
                        { $eq: ["$status", "reviewed"] },
                        { $eq: ["$progressPercent", 100] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ]),
      ]);

      const statsByCourseId = new Map(
        assignmentStats.map((item) => [
          String(item._id),
          {
            assignedCount: item.assignedCount || 0,
            completedCount: item.completedCount || 0,
            completion: item.assignedCount > 0 ? Math.round((item.completedCount / item.assignedCount) * 100) : 0,
          },
        ])
      );

      const decoratedCourses = courses.map((course) => {
        const stats = statsByCourseId.get(String(course._id)) || { assignedCount: 0, completedCount: 0, completion: 0 };
        return {
          ...course.toObject(),
          ...stats,
        };
      });

      return res.json({ courses: decoratedCourses });
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
    const existing = await Course.findOne({ title: req.body.title, createdBy: req.user.id });
    if (existing) {
      return res.status(409).json({ message: "A course with this title already exists.", course: existing });
    }
    const { notes, ...courseInput } = req.body;
    const { course, notes: savedNotes } = await createCourseWithNotes(
      normalizeCoursePayload(courseInput, req.user.id),
      notes,
      req.user.id
    );
    res.status(201).json({ course, notes: savedNotes });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "A course with this title already exists." });
    }
    next(error);
  }
});

app.get("/api/teacher/me", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const teacher = await User.findById(req.user.id)
      .select("-passwordHash")
      .populate("teacherProfile.center", "name address city pincode contactPerson phone email")
      .populate("teacherProfile.classes", "name ageGroup curriculumLevel schedule");

    res.json({ teacher });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/teacher/me", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const { name, phone, photoUrl, language, preferredNotificationChannel, teacherProfile = {} } = req.body;
    const allowedProfileFields = ["qualification", "subject", "experience", "address"];
    const update = {};

    if (name !== undefined) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (photoUrl !== undefined) update.photoUrl = photoUrl;
    if (language !== undefined) update.language = language;
    if (preferredNotificationChannel !== undefined) update.preferredNotificationChannel = preferredNotificationChannel;

    for (const field of allowedProfileFields) {
      if (teacherProfile[field] !== undefined) {
        update[`teacherProfile.${field}`] = teacherProfile[field];
      }
    }

    const teacher = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true })
      .select("-passwordHash")
      .populate("teacherProfile.center", "name address city pincode contactPerson phone email")
      .populate("teacherProfile.classes", "name ageGroup curriculumLevel schedule");

    res.json({ teacher });
  } catch (error) {
    next(error);
  }
});

// ── Teacher Language Preference (persisted to Atlas) ──
app.patch("/api/teacher/me/language", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const { language } = req.body;
    const validLanguages = ["English", "Hindi", "Marathi", "Telugu", "Kannada", "Tamil"];
    if (!language || !validLanguages.includes(language)) {
      return res.status(400).json({ message: "Invalid language. Supported: " + validLanguages.join(", ") });
    }
    await User.findByIdAndUpdate(req.user.id, { language });
    res.json({ success: true, language });
  } catch (error) {
    next(error);
  }
});

// ── Teacher Notification Preference (persisted to Atlas) ──
app.patch("/api/teacher/me/notification-preference", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const { preferredNotificationChannel } = req.body;
    const validChannels = ["in_app", "email", "sms", "whatsapp", "all"];
    if (!preferredNotificationChannel || !validChannels.includes(preferredNotificationChannel)) {
      return res.status(400).json({ message: "Invalid channel. Supported: " + validChannels.join(", ") });
    }
    await User.findByIdAndUpdate(req.user.id, { preferredNotificationChannel });
    res.json({ success: true, preferredNotificationChannel });
  } catch (error) {
    next(error);
  }
});

// ── Admin Language Preference (persisted to Atlas User) ──
app.patch("/api/admin/me/language", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { language } = req.body;
    const validLanguages = ["English", "Hindi", "Marathi", "Telugu", "Kannada", "Tamil"];
    if (!language || !validLanguages.includes(language)) {
      return res.status(400).json({ message: "Invalid language. Supported: " + validLanguages.join(", ") });
    }
    await User.findByIdAndUpdate(req.user.id, { language });
    // Also save to PortalSetting for consistency
    await PortalSetting.findOneAndUpdate({ key: "adminLanguage" }, { value: language }, { upsert: true });
    res.json({ success: true, language });
  } catch (error) {
    next(error);
  }
});

// ── Admin SMTP Config Save (persisted to Atlas PortalSetting) ──
app.post("/api/admin/settings/smtp", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPass, fromEmail, fromName } = req.body;
    if (!smtpHost || !smtpUser || !smtpPass) {
      return res.status(400).json({ message: "SMTP host, user, and password are required" });
    }
    const upserts = [
      { key: "smtpHost", value: smtpHost },
      { key: "smtpPort", value: String(smtpPort || 587) },
      { key: "smtpUser", value: smtpUser },
      { key: "smtpPass", value: smtpPass },
      { key: "fromEmail", value: fromEmail || smtpUser },
      { key: "fromName", value: fromName || "SpacECE Notifications" },
    ];
    for (const s of upserts) {
      await PortalSetting.findOneAndUpdate({ key: s.key }, { value: s.value }, { upsert: true });
    }
    console.log("[admin] smtp_config_saved", JSON.stringify({ smtpHost, smtpUser }));
    res.json({ success: true, message: "SMTP configuration saved to database" });
  } catch (error) {
    next(error);
  }
});

// ── Admin Twilio Config Save (persisted to Atlas PortalSetting) ──
app.post("/api/admin/settings/twilio", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { twilioSid, twilioToken, twilioFrom } = req.body;
    if (!twilioSid || !twilioToken || !twilioFrom) {
      return res.status(400).json({ message: "Twilio SID, token, and from number are required" });
    }
    const upserts = [
      { key: "twilioSid", value: twilioSid },
      { key: "twilioToken", value: twilioToken },
      { key: "twilioFrom", value: twilioFrom },
    ];
    for (const s of upserts) {
      await PortalSetting.findOneAndUpdate({ key: s.key }, { value: s.value }, { upsert: true });
    }
    console.log("[admin] twilio_config_saved", JSON.stringify({ twilioSid }));
    res.json({ success: true, message: "Twilio configuration saved to database" });
  } catch (error) {
    next(error);
  }
});

app.get("/api/teacher/classes", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const teacher = await User.findById(req.user.id).select("teacherProfile");
    const classIds = teacher?.teacherProfile?.classes || [];
    const singleClassId = teacher?.teacherProfile?.class;
    const allClassIds = [...new Set([...classIds.map(id => id.toString()), singleClassId?.toString()].filter(Boolean))];
    if (allClassIds.length === 0) {
      return res.json({ classes: [] });
    }
    const classes = await ClassModel.find({ _id: { $in: allClassIds } });
    res.json({ classes });
  } catch (error) {
    next(error);
  }
});

app.get("/api/teacher/children", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const teacher = await User.findById(req.user.id).select("teacherProfile");
    const classIds = teacher?.teacherProfile?.classes || [];
    const singleClassId = teacher?.teacherProfile?.class;
    const allClassIds = [...new Set([...classIds.map(id => id.toString()), singleClassId?.toString()].filter(Boolean))];

    if (allClassIds.length === 0) {
      return res.json({ children: [] });
    }

    const requestedClassId = req.query.classId;
    const filter = { status: "active" };

    if (requestedClassId && allClassIds.includes(requestedClassId)) {
      filter.class = requestedClassId;
    } else {
      filter.class = { $in: allClassIds };
    }

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
    const defaultClassId = teacher?.teacherProfile?.class;
    const assignedClassIds = (teacher?.teacherProfile?.classes || []).map(id => id.toString());
    const allClassIds = [...new Set([defaultClassId?.toString(), ...assignedClassIds].filter(Boolean))];

    // Allow teacher to specify classId if they have multiple classes
    const classId = req.body.classId || defaultClassId;
    if (!classId) {
      return res.status(400).json({ message: "No class assigned. Please contact admin." });
    }
    // Verify teacher is assigned to this class
    if (!allClassIds.includes(classId.toString())) {
      return res.status(403).json({ message: "You are not assigned to this class." });
    }

    // Resolve center from class if not from teacher profile
    const resolvedCenter = centerId || req.body.centerId;

    const child = await Child.create({
      ...req.body,
      center: resolvedCenter,
      class: classId,
      rollNo: await getNextChildRollNo(classId),
      status: req.body.status || "active",
      createdBy: req.user.id,
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
    // FIX: get classId from teacher's profile first
    const teacherUser = await User.findById(req.user.id).select("teacherProfile");
    const classId = teacherUser?.teacherProfile?.class;

    const [courses, lessons, activities, attendance, totalChildren] = await Promise.all([
      CourseAssignment.find({ teacher: req.user.id }).populate("course"),
      LessonPlanAssignment.find({ teacher: req.user.id }).populate("lessonPlan", "title scheduleDate"),
      ActivitySubmission.find({ teacher: req.user.id }).sort({ activityDate: -1 }),
      TeacherAttendanceRecord.find({ teacher: req.user.id }).sort({ attendanceDate: -1 }),
      classId ? Child.countDocuments({ class: classId, status: "active" }) : Promise.resolve(0),
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
        .populate("teacherProfile.classes", "name schedule"),
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
      const classNames = (teacher?.teacherProfile?.classes || []).map(c => c?.name).filter(Boolean);
      const className = teacher?.teacherProfile?.class?.name || (classNames.length > 0 ? classNames.join(", ") : "not assigned yet");
      reply = `Your assigned center is ${teacher?.teacherProfile?.center?.name || "not assigned yet"} and your class(es) are ${className}.`;
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
    const { teachers = [], classes: classesPayload, ...centerPayload } = req.body;
    const center = await Center.findByIdAndUpdate(req.params.id, centerPayload, { new: true });

    // If classes payload provided, handle class creation/update and teacher assignments
    if (classesPayload && Array.isArray(classesPayload)) {
      const createdClasses = [];
      const teacherClassMap = {}; // { teacherId: [classId, ...] }
      const assignmentErrors = [];

      for (const cls of classesPayload) {
        const { teacherId, id: classId, ...classData } = cls;
        let classRecord;

        if (classId) {
          // Update existing class
          classRecord = await ClassModel.findByIdAndUpdate(classId, classData, { new: true });
        } else {
          // Create new class
          classRecord = await ClassModel.findOneAndUpdate(
            { center: req.params.id, name: classData.name },
            { center: req.params.id, ...classData },
            { new: true, upsert: true, setDefaultsOnInsert: true }
          );
        }
        createdClasses.push(classRecord);

        // Map teacher to this class (multiple teachers per class allowed)
        if (teacherId) {
          // Check for cross-center assignment warnings
          const existingUser = await User.findOne({
            _id: teacherId,
            role: "teacher",
          }).select("_id name teacherProfile.center teacherProfile.classes");

          if (existingUser && existingUser.teacherProfile?.center) {
            const existingCenterId = String(existingUser.teacherProfile.center);
            if (existingCenterId !== String(req.params.id)) {
              // Teacher is assigned to a different center — emit a warning
              assignmentErrors.push({
                teacherId,
                teacherName: existingUser.name,
                className: classData.name,
                message: `Teacher "${existingUser.name}" is already assigned to another center. Please verify schedule conflicts and travel feasibility.`,
                type: "cross_center_warning",
              });
            }
          }

          if (!teacherClassMap[teacherId]) teacherClassMap[teacherId] = [];
          teacherClassMap[teacherId].push(classRecord._id);
        }
      }

      // Assign teachers to center and their respective classes (warnings are non-blocking)
      if (teachers.length) {
        if (Object.keys(teacherClassMap).length > 0) {
          for (const [teacherId, classIds] of Object.entries(teacherClassMap)) {
            // Merge new classes with existing classes to support multi-center assignments
            const existingUser = await User.findById(teacherId).select("teacherProfile.classes");
            const existingClassIds = (existingUser?.teacherProfile?.classes || []).map(String);
            const mergedClassIds = [...new Set([...existingClassIds, ...classIds.map(String)])];

            await User.findByIdAndUpdate(teacherId, {
              $set: {
                "teacherProfile.center": req.params.id,
                "teacherProfile.classes": mergedClassIds,
              },
            });
          }
          // For teachers without specific class assignments, only set the center
          const teachersWithClasses = Object.keys(teacherClassMap);
          const teachersWithoutClasses = teachers.filter(t => !teachersWithClasses.includes(t));
          if (teachersWithoutClasses.length > 0) {
            await User.updateMany(
              { _id: { $in: teachersWithoutClasses }, role: "teacher" },
              { $set: { "teacherProfile.center": req.params.id } }
            );
          }
        } else {
          // No specific class assignments - only set the center
          await User.updateMany(
            { _id: { $in: teachers }, role: "teacher" },
            { $set: { "teacherProfile.center": req.params.id } }
          );
        }
      } else if (teachers.length) {
        // No classes payload - only set the center
        await User.updateMany(
          { _id: { $in: teachers }, role: "teacher" },
          { $set: { "teacherProfile.center": req.params.id } }
        );
      }

      // Return with any cross-center warnings (non-blocking)
      const crossCenterWarnings = assignmentErrors.filter(e => e.type === "cross_center_warning");
      if (crossCenterWarnings.length > 0) {
        return res.json({
          center,
          warnings: crossCenterWarnings,
          message: `Center updated. Note: ${crossCenterWarnings.map(e => e.message).join("; ")}`,
        });
      }

      res.json({ center });
    } else if (teachers.length) {
      // No classes payload - only set the center
      await User.updateMany(
        { _id: { $in: teachers }, role: "teacher" },
        { $set: { "teacherProfile.center": req.params.id } }
      );
      res.json({ center });
    } else {
      res.json({ center });
    }
  } catch (error) {
    next(error);
  }
});

app.delete("/api/centers/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    await Center.findByIdAndUpdate(req.params.id, { status: "inactive" });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// TEACHER-CLASS ASSIGNMENTS FOR A CENTER
// ==========================================
app.get("/api/centers/:id/teacher-assignments", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    requireObjectId(req.params.id, "center id");
    
    // Get all classes for this center
    const classes = await ClassModel.find({ center: req.params.id })
      .select("_id name ageGroup curriculumLevel schedule")
      .sort({ name: 1 });
    
    // Get all teachers assigned to this center
    const teachers = await User.find({
      role: "teacher",
      "teacherProfile.center": req.params.id,
    })
      .select("_id name email status teacherProfile.classes")
      .sort({ name: 1 });
    
    // Build assignment map: classId -> teacher
    const assignments = {};
    for (const teacher of teachers) {
      const classIds = (teacher.teacherProfile?.classes || []).map(String);
      for (const classId of classIds) {
        if (!assignments[classId]) {
          assignments[classId] = [];
        }
        assignments[classId].push({
          _id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          status: teacher.status,
        });
      }
    }
    
    // Build response with all teachers per class
    const classAssignments = classes.map(cls => {
      const assignedTeachers = assignments[cls._id.toString()] || [];
      return {
        class: cls,
        teachers: assignedTeachers,
        teacher: assignedTeachers.length > 0 ? assignedTeachers[0] : null, // backward compat
        hasMultipleTeachers: assignedTeachers.length > 1,
      };
    });
    
    res.json({ 
      centerId: req.params.id,
      classes: classAssignments,
      totalClasses: classes.length,
      assignedClasses: classAssignments.filter(a => a.teacher).length,
      unassignedClasses: classAssignments.filter(a => !a.teacher).length,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// VALIDATE ASSIGNMENTS (Informational Only)
// ==========================================
app.post("/api/centers/:id/validate-assignments", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    requireObjectId(req.params.id, "center id");
    
    // Get all classes for this center
    const classes = await ClassModel.find({ center: req.params.id }).select("_id name");
    
    // Get all teachers assigned to this center
    const teachers = await User.find({
      role: "teacher",
      "teacherProfile.center": req.params.id,
    }).select("_id name teacherProfile.classes teacherProfile.center");
    
    // Build assignment summary per class
    const classTeacherCount = {};
    for (const teacher of teachers) {
      const classIds = (teacher.teacherProfile?.classes || []).map(String);
      for (const classId of classIds) {
        if (!classTeacherCount[classId]) classTeacherCount[classId] = [];
        classTeacherCount[classId].push(teacher.name);
      }
    }
    
    // Build informational summary (not violations)
    const assignmentSummary = classes.map(cls => {
      const teacherNames = classTeacherCount[cls._id.toString()] || [];
      return {
        classId: cls._id,
        className: cls.name,
        teacherCount: teacherNames.length,
        teachers: teacherNames,
      };
    });

    // Identify classes with multiple teachers (informational, not blocking)
    const multiTeacherClasses = assignmentSummary.filter(s => s.teacherCount > 1);
    
    // Identify unassigned classes
    const unassignedClasses = assignmentSummary.filter(s => s.teacherCount === 0);
    
    // Check for teachers assigned across multiple centers
    const crossCenterTeachers = [];
    for (const teacher of teachers) {
      const teacherClasses = teacher.teacherProfile?.classes || [];
      if (teacherClasses.length > 0) {
        // Check if any of the teacher's classes belong to other centers
        const otherCenterClasses = await ClassModel.find({
          _id: { $in: teacherClasses },
          center: { $ne: req.params.id },
        }).select("_id name center");
        if (otherCenterClasses.length > 0) {
          crossCenterTeachers.push({
            teacherId: teacher._id,
            teacherName: teacher.name,
            otherCenterClasses: otherCenterClasses.map(c => c.name),
          });
        }
      }
    }
    
    res.json({
      valid: true, // Always valid — this is informational only
      assignmentSummary,
      multiTeacherClasses,
      unassignedClasses,
      crossCenterTeachers,
      totalClasses: classes.length,
      totalTeachers: teachers.length,
      message: multiTeacherClasses.length > 0
        ? `${multiTeacherClasses.length} class(es) have multiple teachers assigned. This is allowed.`
        : "All assignments look good.",
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// CLASS MANAGEMENT
// ==========================================

async function logClassAction(action, classId, className, centerId, performedBy, performedByName, changes = null) {
  try {
    await ClassLog.create({
      action,
      classId,
      className: className || "",
      centerId,
      performedBy,
      performedByName: performedByName || "",
      changes,
    });
  } catch (error) {
    console.error("Failed to write class audit log:", error);
  }
}

app.get("/api/admin/classes", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const centerId = objectIdFilter(req.query.centerId, "centerId");
    const filter = centerId ? { center: centerId } : {};
    const classes = await ClassModel.find(filter).populate("center", "_id name city").sort({ createdAt: -1 });
    res.json({ classes });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/classes", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { center, name, ...rest } = req.body;
    if (!center || !name) {
      return res.status(400).json({ message: "center and name are required." });
    }
    requireObjectId(center, "center");
    const classRecord = await ClassModel.findOneAndUpdate(
      { center, name },
      { center, name, ...rest },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    await logClassAction("create", classRecord._id, classRecord.name, classRecord.center, req.user.id, req.user.name, rest);
    res.status(201).json({ class: classRecord });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "A class with this name already exists for the selected center." });
    }
    next(error);
  }
});

app.get("/api/admin/classes/logs", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const classId = objectIdFilter(req.query.classId, "classId");
    const filter = classId ? { classId } : {};
    const logs = await ClassLog.find(filter)
      .populate("performedBy", "name email role")
      .populate("centerId", "name city")
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/classes/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    requireObjectId(req.params.id, "class id");
    const existing = await ClassModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Class not found." });
    const classRecord = await ClassModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    await logClassAction("update", classRecord._id, classRecord.name, classRecord.center, req.user.id, req.user.name, { before: existing?.toObject(), after: req.body });
    res.json({ class: classRecord });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/classes/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    requireObjectId(req.params.id, "class id");
    const existing = await ClassModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Class not found." });
    await ClassModel.findByIdAndDelete(req.params.id);
    await logClassAction("delete", existing?._id, existing?.name || "", existing?.center, req.user.id, req.user.name);
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
    requireObjectId(req.params.id, "child id");
    const { centerId, classId, ...updatePayload } = req.body;
    if (centerId !== undefined) requireObjectId(centerId, "centerId");
    if (classId !== undefined) requireObjectId(classId, "classId");
    const child = await Child.findByIdAndUpdate(req.params.id, {
      ...updatePayload,
      ...(centerId !== undefined ? { center: centerId } : {}),
      ...(classId !== undefined ? { class: classId } : {}),
    }, { new: true });
    if (!child) return res.status(404).json({ message: "Child not found." });
    res.json({ child });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/children/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    requireObjectId(req.params.id, "child id");
    const child = await Child.findByIdAndDelete(req.params.id);
    if (!child) return res.status(404).json({ message: "Child not found." });
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
      // Don't auto-assign all classes when only center is set
      // Teachers should only get classes that are explicitly assigned to them
    }
    const teacher = await User.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .select("-passwordHash")
      .populate("teacherProfile.center", "name city")
      .populate("teacherProfile.classes", "name ageGroup curriculumLevel schedule");
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

app.patch("/api/admin/teachers/:id/block", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const teacher = await User.findOneAndUpdate(
      { _id: req.params.id, role: "teacher" },
      { status: "blocked" },
      { new: true }
    ).select("-passwordHash");
    if (!teacher) return res.status(404).json({ message: "Teacher not found." });
    res.json({ teacher });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/teachers/:id/unblock", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const teacher = await User.findOneAndUpdate(
      { _id: req.params.id, role: "teacher" },
      { status: "approved" },
      { new: true }
    ).select("-passwordHash");
    if (!teacher) return res.status(404).json({ message: "Teacher not found." });
    res.json({ teacher });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/teachers/:id/assign-center", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { centerId, classIds } = req.body;
    const updateData = {};

    if (centerId !== undefined) updateData["teacherProfile.center"] = centerId || null;

    if (classIds !== undefined) {
      updateData["teacherProfile.classes"] = Array.isArray(classIds) ? classIds : [];
    }

    const teacher = await User.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .select("-passwordHash")
      .populate("teacherProfile.center", "name address city pincode contactPerson phone email")
      .populate("teacherProfile.classes", "name ageGroup curriculumLevel schedule");
    if (!teacher) return res.status(404).json({ message: "Teacher not found." });
    res.json({ teacher });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// COURSE MANAGEMENT
// ==========================================
app.patch("/api/courses/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    requireObjectId(req.params.id, "course id");
    const course = await Course.findByIdAndUpdate(req.params.id, normalizeCoursePayload(req.body, req.user.id), { new: true });
    if (!course) return res.status(404).json({ message: "Course not found." });
    res.json({ course });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/courses/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    requireObjectId(req.params.id, "course id");
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found." });
    await Note.deleteMany({ course: req.params.id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// AI Course Generation (mounted router with auth + admin middleware)
import courseAiRouter from "./routes/courseAi.js";
app.use("/api/courses/ai", requireAuth, requireRole("admin"), courseAiRouter);
// Grades routes
import gradesRouter from "./routes/grades.js";
app.use("/api/grades", gradesRouter);
// Schedules routes
import schedulesRouter from "./routes/schedules.js";
app.use("/api/schedules", schedulesRouter);
// Certificates routes
import certificatesRouter from "./routes/certificates.js";
app.use("/api/certificates", certificatesRouter);

app.post("/api/courses/:id/assign", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { teacherId, dueDate } = req.body;
    requireObjectId(req.params.id, "course id");
    requireObjectId(teacherId, "teacherId");
    const assignment = await CourseAssignment.findOneAndUpdate(
      { course: req.params.id, teacher: teacherId },
      { 
        course: req.params.id, 
        teacher: teacherId, 
        assignedBy: req.user.id, 
        dueDate, 
        status: "assigned",
        progressPercent: 0,
        completedContent: []
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    // Real-time notification via socket
    await createAndEmitNotification({
      recipientId: teacherId,
      title: "New course assigned",
      body: "A training course has been assigned to your teacher portal.",
      type: "course_assigned",
      metadata: { courseId: req.params.id, assignmentId: assignment._id },
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
      .populate("teacher", "name email")
      .populate("reviewedBy", "name email");
    res.json({ assignments });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/courses/assignments/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { status, feedback, score, rubric, trainer, reviewedBy, reviewedAt, notified, annotations } = req.body;
    const update = {};
    if (status !== undefined) update.status = status;
    if (feedback !== undefined) update.feedback = feedback;
    if (score !== undefined) update.score = score;
    if (rubric !== undefined) update.rubric = rubric;
    if (trainer !== undefined) update.trainer = trainer;
    if (reviewedBy !== undefined && mongoose.isValidObjectId(reviewedBy)) update.reviewedBy = reviewedBy;
    if (reviewedAt !== undefined) update.reviewedAt = reviewedAt;
    if (notified !== undefined) update.notified = notified;
    if (annotations !== undefined) update.annotations = annotations;
    if (status && ["reviewed", "approved", "revision"].includes(status) && !update.reviewedAt) {
      update.reviewedAt = new Date();
    }
    if (status && ["reviewed", "approved", "revision"].includes(status) && !update.reviewedBy) {
      update.reviewedBy = req.user.id;
    }

    const assignment = await CourseAssignment.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    ).populate("course").populate("teacher", "name email").populate("reviewedBy", "name email");
    
    // Real-time notify teacher when admin reviews
    if (status && assignment?.teacher?._id) {
      const statusMessages = {
        approved: "Your assignment has been approved!",
        reviewed: "Your assignment has been reviewed. Check your grades.",
        revision: "Your assignment needs revision. Please check feedback and resubmit.",
      };
      if (statusMessages[status]) {
        await createAndEmitNotification({
          recipientId: assignment.teacher._id,
          title: `Assignment ${status}: ${assignment.course?.title || "Course"}`,
          body: statusMessages[status],
          type: "assignment_reviewed",
          metadata: { assignmentId: req.params.id, status, score },
        });
      }
    }
    
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

    // Notify admin when teacher submits an assignment
    if (status === "submitted" && assignment) {
      const admins = await User.find({ role: "admin" }).select("_id");
      for (const admin of admins) {
        await createAndEmitNotification({
          recipientId: admin._id,
          title: `Assignment Submitted: ${assignment.course?.title || "Course"}`,
          body: `${req.user.name || "A teacher"} has submitted "${assignment.title || "Course Assignment"}" for your review.`,
          type: "assignment_submitted",
          metadata: { assignmentId: req.params.id },
        });
      }
    }

    res.json({ assignment });
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/generate-course", requireAuth, async (req, res, next) => {
  try {
    const result = await generateAICourse(req.body || {});
    res.json({ course: result });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
});

app.post("/api/courses/generate-from-ai", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    console.log("[ai-course] generate_and_save_start", JSON.stringify({ userId: req.user.id, topic: req.body?.topic || req.body?.title }));
    const result = await generateAICourse(req.body || {});
    const existing = await Course.findOne({ title: result.title, createdBy: req.user.id });
    if (existing) {
      return res.status(409).json({ message: "A course with this generated title already exists.", course: existing });
    }
    const { notes, ...courseInput } = result;
    const saved = await createCourseWithNotes(
      normalizeCoursePayload(courseInput, req.user.id),
      notes,
      req.user.id
    );
    console.log("[ai-course] generate_and_save_success", JSON.stringify({ courseId: saved.course._id, notes: saved.notes.length }));
    res.status(201).json(saved);
  } catch (error) {
    console.error("[ai-course] generate_and_save_failed", JSON.stringify({ message: error.message, status: error.status }));
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
});

app.get("/api/courses/:courseId/notes", requireAuth, async (req, res, next) => {
  try {
    const notes = await Note.find({ course: req.params.courseId }).populate("createdBy", "name email").sort({ createdAt: -1 });
    res.json({ notes });
  } catch (error) {
    next(error);
  }
});

app.post("/api/courses/:courseId/notes", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const note = await Note.create({ ...req.body, course: req.params.courseId, createdBy: req.user.id });
    res.status(201).json({ note });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/courses/notes/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const note = await Note.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate("createdBy", "name email");
    res.json({ note });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/courses/notes/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    await Note.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/teacher/courses/:courseId/notes", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const notes = await Note.find({ course: req.params.courseId }).populate("createdBy", "name email").sort({ createdAt: -1 });
    res.json({ notes });
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
    requireObjectId(req.params.id, "lesson plan id");
    const lessonPlan = await LessonPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!lessonPlan) return res.status(404).json({ message: "Lesson plan not found." });
    res.json({ lessonPlan });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/lesson-plans/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    requireObjectId(req.params.id, "lesson plan id");
    const lessonPlan = await LessonPlan.findByIdAndDelete(req.params.id);
    if (!lessonPlan) return res.status(404).json({ message: "Lesson plan not found." });
    // Cascade delete associated assignments and reports
    const assignments = await LessonPlanAssignment.find({ lessonPlan: req.params.id });
    const assignmentIds = assignments.map(a => a._id);
    await LessonPlanAssignment.deleteMany({ lessonPlan: req.params.id });
    await LessonCompletionReport.deleteMany({ assignment: { $in: assignmentIds } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/* ── Lesson Plan Auto-Generation Engine ── */
app.post("/api/lesson-plans/auto-generate", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { courseId, classId, centerId, startDate, durationWeeks, maxActivitiesPerDay = 2 } = req.body;
    requireObjectId(courseId, "courseId");

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found." });

    // Flatten all activities from course modules → contents
    const allActivities = [];
    (course.modules || []).forEach((mod, mi) => {
      (mod.contents || []).forEach((content, ci) => {
        allActivities.push({
          moduleIndex: mi,
          contentIndex: ci,
          moduleTitle: mod.title,
          contentTitle: content.title,
          contentType: content.type,
          durationMinutes: content.durationMinutes || 30,
          objectives: (mod.learningOutcomes || []).join("; "),
          instructions: content.detailedLearningContent || content.description || "",
          resources: content.notes || "",
          activities: content.practicalExamples ? content.practicalExamples.join(", ") : "",
        });
      });
      // Also add module assessments as activities if they exist
      if (mod.assessments) {
        (mod.assessments.practicalAssignments || []).forEach((pa, pai) => {
          allActivities.push({
            moduleIndex: mi,
            contentIndex: -1,
            moduleTitle: mod.title,
            contentTitle: `Assessment: ${pa.substring(0, 50)}`,
            contentType: "assessment",
            durationMinutes: 45,
            objectives: (mod.learningOutcomes || []).join("; "),
            instructions: pa,
            resources: "",
            activities: pa,
          });
        });
      }
    });

    if (allActivities.length === 0) {
      return res.status(400).json({ message: "Course has no modules or activities to generate from." });
    }

    // Generate working days (Mon-Fri), skip weekends
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + (durationWeeks * 7));

    const workingDays = [];
    const cursor = new Date(start);
    while (cursor < end) {
      const dow = cursor.getDay();
      if (dow >= 1 && dow <= 5) {
        workingDays.push(new Date(cursor));
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    // Distribute activities across working days (max N per day)
    const schedule = [];
    let actIdx = 0;
    for (const day of workingDays) {
      if (actIdx >= allActivities.length) break;
      const dayActivities = [];
      for (let i = 0; i < maxActivitiesPerDay && actIdx < allActivities.length; i++) {
        dayActivities.push({ ...allActivities[actIdx], order: i + 1 });
        actIdx++;
      }
      schedule.push({
        date: day.toISOString().split("T")[0],
        dayOfWeek: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day.getDay()],
        activities: dayActivities,
      });
    }

    res.json({
      course: { id: course._id, title: course.title, moduleCount: (course.modules || []).length },
      totalActivities: allActivities.length,
      totalDays: schedule.length,
      durationWeeks,
      maxActivitiesPerDay,
      schedule,
    });
  } catch (error) {
    next(error);
  }
});

/* ── Confirm & Publish Auto-Generated Plan ── */
app.post("/api/lesson-plans/auto-publish", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { courseId, classId, centerId, schedule, title } = req.body;
    if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
      return res.status(400).json({ message: "Schedule data is required." });
    }

    // Create one LessonPlan per day's activities
    const createdPlans = [];
    for (const day of schedule) {
      const activitiesText = day.activities.map(a => `${a.order}. [${a.moduleTitle}] ${a.contentTitle}`).join("\n");
      const objectivesText = [...new Set(day.activities.map(a => a.objectives).filter(Boolean))].join("; ");
      const instructionsText = day.activities.map(a => a.instructions).filter(Boolean).join("\n\n");
      const resourcesText = day.activities.map(a => a.resources).filter(Boolean).join(", ");

      const plan = await LessonPlan.create({
        course: courseId || undefined,
        title: title ? `${title} — ${day.date} (${day.dayOfWeek})` : `Auto Plan — ${day.date} (${day.dayOfWeek})`,
        objectives: objectivesText,
        instructions: instructionsText || activitiesText,
        activities: activitiesText,
        resources: resourcesText,
        scheduleDate: new Date(day.date),
        createdBy: req.user.id,
      });
      createdPlans.push(plan);
    }

    // Auto-assign to matching teachers
    let assignedCount = 0;
    if (classId || centerId) {
      const teacherQuery = { status: "approved" };
      if (centerId) teacherQuery["teacherProfile.center"] = centerId;
      if (classId) teacherQuery["teacherProfile.classes"] = classId;

      const teachers = await User.find(teacherQuery);
      for (const plan of createdPlans) {
        for (const teacher of teachers) {
          const existing = await LessonPlanAssignment.findOne({ lessonPlan: plan._id, teacher: teacher._id });
          if (!existing) {
            await LessonPlanAssignment.create({
              lessonPlan: plan._id,
              teacher: teacher._id,
              center: centerId || teacher.teacherProfile?.center,
              class: classId || (teacher.teacherProfile?.classes || [])[0],
              assignedDate: plan.scheduleDate,
              status: "pending",
            });
            assignedCount++;
          }
        }
      }
    }

    res.status(201).json({
      message: `Published ${createdPlans.length} lesson plans with ${assignedCount} teacher assignments.`,
      plansCreated: createdPlans.length,
      assignmentsCreated: assignedCount,
      plans: createdPlans.map(p => ({ id: p._id, title: p.title, date: p.scheduleDate })),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/lesson-plans/assign", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { lessonPlanId, teacherId, centerId, classId, assignedDate } = req.body;
    requireObjectId(lessonPlanId, "lessonPlanId");
    if (teacherId) requireObjectId(teacherId, "teacherId");
    if (centerId) requireObjectId(centerId, "centerId");
    if (classId) requireObjectId(classId, "classId");
    // Prevent duplicate assignments
    if (teacherId && lessonPlanId) {
      const existing = await LessonPlanAssignment.findOne({ lessonPlan: lessonPlanId, teacher: teacherId });
      if (existing) {
        return res.status(200).json({ assignment: existing, message: "Assignment already exists." });
      }
    }
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
    requireObjectId(req.params.id, "assignment id");
    const { status } = req.body;
    const assignment = await LessonPlanAssignment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!assignment) return res.status(404).json({ message: "Lesson assignment not found." });
    res.json({ assignment });
  } catch (error) {
    next(error);
  }
});


app.post("/api/teacher/lesson-plans/:id/complete", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    requireObjectId(req.params.id, "assignment id");
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
    // Also update the parent assignment status when report is approved
    if (report && (status === "approved" || status === "rejected")) {
      await LessonPlanAssignment.findByIdAndUpdate(report.assignment, { status: "reviewed" });
    }
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
    if (!center || !classId) {
      return res.status(400).json({ message: "Teacher center and class assignment are required before submitting activities." });
    }
    if (!description) {
      return res.status(400).json({ message: "Activity description is required." });
    }
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
    if (req.query.centerId && req.query.centerId !== "undefined") filter.center = req.query.centerId;
    if (req.query.classId && req.query.classId !== "undefined") filter.class = req.query.classId;
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
      if (req.query.teacherId && req.query.teacherId !== "undefined") filter.teacher = req.query.teacherId;
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
    const { status, source, latitude, longitude, note, attendanceDate } = req.body;
    const today = new Date();
    today.setHours(0,0,0,0);
    const recordDate = attendanceDate ? new Date(attendanceDate) : today;
    recordDate.setHours(0,0,0,0);

    const record = await TeacherAttendanceRecord.findOneAndUpdate(
      { teacher: req.user.id, attendanceDate: recordDate },
      {
        teacher: req.user.id,
        attendanceDate: recordDate,
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
    const trainerData = req.body;
    const trainer = await Trainer.create(trainerData);

    // Synchronize to User collection if not already present
    if (trainer.email) {
      const emailLower = trainer.email.toLowerCase().trim();
      const existingUser = await User.findOne({ email: emailLower });
      if (!existingUser) {
        const passwordHash = await hashPassword("Trainer@123");
        await User.create({
          role: "trainer",
          name: trainer.name,
          email: emailLower,
          phone: trainer.phone || "",
          passwordHash,
          status: trainer.status === "inactive" ? "inactive" : "approved",
        });
      }
    }

    res.status(201).json({ trainer });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/trainers/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const oldTrainer = await Trainer.findById(req.params.id);
    const oldEmail = oldTrainer?.email ? oldTrainer.email.toLowerCase().trim() : null;

    const trainer = await Trainer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // Synchronize with User collection
    if (trainer.email) {
      const emailLower = trainer.email.toLowerCase().trim();
      const userStatus = trainer.status === "inactive" ? "inactive" : "approved";
      
      const userQuery = oldEmail ? { email: oldEmail } : { email: emailLower };
      const user = await User.findOne(userQuery);
      
      if (user) {
        user.name = trainer.name;
        user.email = emailLower;
        user.phone = trainer.phone || user.phone;
        user.status = userStatus;
        user.role = "trainer";
        await user.save();
      } else {
        const passwordHash = await hashPassword("Trainer@123");
        await User.create({
          role: "trainer",
          name: trainer.name,
          email: emailLower,
          phone: trainer.phone || "",
          passwordHash,
          status: userStatus,
        });
      }
    }

    res.json({ trainer });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/trainers/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const trainer = await Trainer.findById(req.params.id);
    if (trainer) {
      if (trainer.email) {
        await User.findOneAndDelete({ email: trainer.email.toLowerCase().trim() });
      }
      await Trainer.findByIdAndDelete(req.params.id);
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// TRAINER MESSAGES
// ==========================================

app.get("/api/trainers/:trainerId/messages", requireAuth, async (req, res, next) => {
  try {
    const messages = await TrainerMessage.find({ trainer: req.params.trainerId })
      .populate("sender", "name email role")
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ messages });
  } catch (error) {
    next(error);
  }
});

app.post("/api/trainers/:trainerId/messages", requireAuth, async (req, res, next) => {
  try {
    const { subject, body } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ message: "Subject and body are required." });
    }
    const message = await TrainerMessage.create({
      trainer: req.params.trainerId,
      sender: req.user.id,
      subject,
      body,
    });
    res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/trainers/messages/:messageId/read", requireAuth, async (req, res, next) => {
  try {
    const message = await TrainerMessage.findByIdAndUpdate(
      req.params.messageId,
      { read: true },
      { new: true }
    );
    res.json({ message });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// TRAINER PAYOUTS
// ==========================================
app.get("/api/trainers/:trainerId/payouts", requireAuth, async (req, res, next) => {
  try {
    const payouts = await TrainerPayout.find({ trainer: req.params.trainerId })
      .populate("paidBy", "name email")
      .sort({ createdAt: -1 });
    res.json({ payouts });
  } catch (error) {
    next(error);
  }
});

app.post("/api/trainers/:trainerId/payouts", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { amount, sessions, description, period } = req.body;
    const payout = await TrainerPayout.create({
      trainer: req.params.trainerId,
      amount,
      sessions: sessions || 0,
      description,
      period,
      status: "pending",
    });
    res.status(201).json({ payout });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/trainers/payouts/:payoutId/pay", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const payout = await TrainerPayout.findByIdAndUpdate(
      req.params.payoutId,
      { status: "paid", paidAt: new Date(), paidBy: req.user.id },
      { new: true }
    );
    if (!payout) return res.status(404).json({ message: "Payout not found." });
    res.json({ payout });
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

app.post("/api/notifications/mark-all-read", requireAuth, async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { read: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/notifications/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
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

// ==========================================
// ADMIN USERS
// ==========================================
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

app.patch("/api/admin/users/:id/role", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!["admin", "teacher", "trainer", "super_admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role specified" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    // Promoted to trainer: ensure a Trainer document exists
    if (role === "trainer" && oldRole !== "trainer") {
      const emailLower = user.email ? user.email.toLowerCase().trim() : "";
      const existingTrainer = await Trainer.findOne({ email: emailLower });
      if (!existingTrainer) {
        await Trainer.create({
          name: user.name,
          email: emailLower,
          phone: user.phone || "",
          subject: "General ECCE",
          qualification: "N/A",
          status: user.status === "inactive" ? "inactive" : "active",
        });
      }
    }

    // Demoted from trainer: delete Trainer document
    if (oldRole === "trainer" && role !== "trainer") {
      const emailLower = user.email ? user.email.toLowerCase().trim() : "";
      await Trainer.findOneAndDelete({ email: emailLower });
    }

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/users/:id/status", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["pending", "approved", "rejected", "inactive"].includes(status)) {
      return res.status(400).json({ message: "Invalid status specified" });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true }).select("-passwordHash");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If user is trainer, sync status to Trainer collection
    if (user.role === "trainer") {
      const emailLower = user.email ? user.email.toLowerCase().trim() : "";
      const trainerStatus = status === "approved" ? "active" : "inactive";
      await Trainer.findOneAndUpdate({ email: emailLower }, { $set: { status: trainerStatus } });
    }

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/users/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "trainer") {
      const emailLower = user.email ? user.email.toLowerCase().trim() : "";
      await Trainer.findOneAndDelete({ email: emailLower });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// PORTAL SETTINGS
// ==========================================
app.get("/api/admin/settings", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const docs = await PortalSetting.find({});
    const settings = {};
    docs.forEach((doc) => {
      settings[doc.key] = doc.value;
    });
    res.json({ settings });
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/settings", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const payload = req.body;
    const settingsObj = payload.settings || payload;
    const entries = Object.entries(settingsObj).filter(([, v]) => v !== undefined && v !== null && v !== "");
    if (entries.length === 0) {
      return res.json({ settings: {} });
    }
    const bulkOps = entries.map(([key, value]) => ({
      updateOne: {
        filter: { key },
        update: { $set: { key, value, description: key } },
        upsert: true,
      },
    }));
    await PortalSetting.bulkWrite(bulkOps);
    const response = {};
    entries.forEach(([key, value]) => {
      response[key] = value;
    });
    res.json({ settings: response });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// ADMIN SETTINGS — TEST EMAIL
// ==========================================
app.post("/api/admin/settings/test-email", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { to } = req.body;
    if (!to) {
      return res.status(400).json({ success: false, message: "Recipient email address (to) is required." });
    }

    const result = await sendEmail({
      to,
      subject: "✅ SpacECE Portal — Test Email",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;">
          <h2 style="color:#f59e0b;">🎉 Test Email Successful!</h2>
          <p>This is a test email sent from the <strong>SpacECE Teacher Training Portal</strong>.</p>
          <p>If you received this message, your SMTP configuration is working correctly.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
          <p style="font-size:12px;color:#9ca3af;">Sent at ${new Date().toISOString()} · SpacECE Admin Panel</p>
        </div>
      `,
    });

    if (result.success) {
      return res.json({ success: true, message: `Test email sent to ${to} successfully.`, messageId: result.messageId });
    } else {
      return res.status(500).json({ success: false, message: result.error || "Failed to send test email." });
    }
  } catch (error) {
    next(error);
  }
});

// ==========================================
// ADMIN SETTINGS — TEST SMS
// ==========================================
app.post("/api/admin/settings/test-sms", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { to } = req.body;
    if (!to) {
      return res.status(400).json({ success: false, message: "Phone number is required." });
    }
    const twilioConf = await getTwilioConfig();
    if (!twilioConf) {
      return res.status(500).json({ success: false, message: "Twilio credentials are not configured." });
    }
    const cleanPhone = normalizePhoneE164(to);
    const twilioBase = `https://api.twilio.com/2010-04-01/Accounts/${twilioConf.sid}/Messages.json`;
    try {
      const resp = await fetch(twilioBase, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic " + Buffer.from(`${twilioConf.sid}:${twilioConf.token}`).toString("base64"),
        },
        body: new URLSearchParams({ To: cleanPhone, From: twilioConf.from, Body: "SpacECE Portal — Test SMS successful! Your Twilio SMS configuration is working." }).toString(),
      });
      const data = await resp.json();
      if (resp.ok) {
        return res.json({ success: true, message: `Test SMS sent to ${cleanPhone}.`, sid: data.sid });
      } else {
        return res.status(500).json({ success: false, message: data.message || "Twilio SMS failed." });
      }
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || "Twilio network error." });
    }
  } catch (error) {
    next(error);
  }
});

// ==========================================
// ADMIN SETTINGS — TEST WHATSAPP
// ==========================================
app.post("/api/admin/settings/test-whatsapp", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { to } = req.body;
    if (!to) {
      return res.status(400).json({ success: false, message: "Phone number is required." });
    }
    const twilioConf = await getTwilioConfig();
    if (!twilioConf) {
      return res.status(500).json({ success: false, message: "Twilio credentials are not configured." });
    }
    const cleanPhone = normalizePhoneE164(to);
    const toNumber = `whatsapp:${cleanPhone}`;
    const fromNumber = `whatsapp:${twilioConf.from}`;
    const twilioBase = `https://api.twilio.com/2010-04-01/Accounts/${twilioConf.sid}/Messages.json`;
    try {
      const resp = await fetch(twilioBase, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic " + Buffer.from(`${twilioConf.sid}:${twilioConf.token}`).toString("base64"),
        },
        body: new URLSearchParams({ To: toNumber, From: fromNumber, Body: "SpacECE Portal — Test WhatsApp successful! Your Twilio WhatsApp configuration is working." }).toString(),
      });
      const data = await resp.json();
      if (resp.ok) {
        return res.json({ success: true, message: `Test WhatsApp sent to ${cleanPhone}.`, sid: data.sid });
      } else {
        return res.status(500).json({ success: false, message: data.message || "Twilio WhatsApp failed." });
      }
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || "Twilio network error." });
    }
  } catch (error) {
    next(error);
  }
});

// ==========================================
// ADMIN NOTIFICATIONS
// ==========================================
const broadcastRateLimit = { lastBroadcast: null, count: 0, windowStart: null };
const BROADCAST_RATE_LIMIT = 10; // max broadcasts per hour
const BROADCAST_WINDOW_MS = 60 * 60 * 1000; // 1 hour

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
    // Rate limiting check
    const now = new Date();
    if (broadcastRateLimit.windowStart && (now - broadcastRateLimit.windowStart) > BROADCAST_WINDOW_MS) {
      broadcastRateLimit.count = 0;
      broadcastRateLimit.windowStart = now;
    }
    if (!broadcastRateLimit.windowStart) {
      broadcastRateLimit.windowStart = now;
    }
    broadcastRateLimit.count++;
    if (broadcastRateLimit.count > BROADCAST_RATE_LIMIT) {
      return res.status(429).json({ message: `Rate limit exceeded. Maximum ${BROADCAST_RATE_LIMIT} broadcasts per hour.` });
    }

    const {
      subject,
      body,
      channel = "in_app",
      audience = "all",
      teacherIds = [],
      scheduledFor,
      isRetry,
      originalNotificationId,
    } = req.body;

    if (!subject || !body) {
      return res.status(400).json({ message: "Subject and message are required" });
    }

    // ─── RETRY LOGIC ───
    if (isRetry && originalNotificationId) {
      const originalNotif = await Notification.findById(originalNotificationId).populate("recipient", "_id name email phone status");
      if (!originalNotif) {
        return res.status(404).json({ message: "Original notification not found" });
      }

      const recipient = originalNotif.recipient;
      if (!recipient) {
        return res.status(404).json({ message: "Recipient not found" });
      }

      let success = false;
      let errorMsg = null;

      if (channel === "email") {
        if (!recipient.email) {
          errorMsg = "Recipient has no email address";
        } else {
          const result = await sendEmail({
            to: recipient.email,
            subject,
            html: `<h2>${subject}</h2><p>${body}</p><p><a href="${process.env.FRONTEND_URL || "http://localhost:5173"}">Open SpacECE Portal</a></p>`,
          });
          success = result.success;
          errorMsg = result.error || null;
        }
      } else if (channel === "sms" || channel === "whatsapp") {
        const twilioConf = await getTwilioConfig();
        if (!twilioConf) {
          errorMsg = "Twilio credentials are not configured in settings.";
        } else if (!recipient.phone) {
          errorMsg = "Recipient has no phone number";
        } else {
          const cleanPhone = normalizePhoneE164(recipient.phone);
          const toNumber = channel === "whatsapp" ? `whatsapp:${cleanPhone}` : cleanPhone;
          const fromNumber = channel === "whatsapp" ? `whatsapp:${twilioConf.from}` : twilioConf.from;
          const twilioBase = `https://api.twilio.com/2010-04-01/Accounts/${twilioConf.sid}/Messages.json`;

          try {
            const resp = await fetch(twilioBase, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: "Basic " + Buffer.from(`${twilioConf.sid}:${twilioConf.token}`).toString("base64"),
              },
              body: new URLSearchParams({ To: toNumber, From: fromNumber, Body: `${subject}\n\n${body}` }).toString(),
            });
            const data = await resp.json();
            if (resp.ok) {
              success = true;
            } else {
              errorMsg = data.message || "Twilio delivery failed";
            }
          } catch (err) {
            errorMsg = err.message || "Twilio network error";
          }
        }
      } else {
        success = true;
      }

      originalNotif.status = success ? "delivered" : "failed";
      originalNotif.error = errorMsg;
      originalNotif.sentAt = success ? now : undefined;
      originalNotif.read = false;
      originalNotif.readAt = null;
      await originalNotif.save();

      return res.status(200).json({ notifications: [originalNotif], recipientCount: 1 });
    }

    // ─── REGULAR BROADCAST LOGIC ───
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
    const buildDoc = (recipientId, notifChannel, notifStatus, opts = {}) => ({
      recipient: recipientId,
      channel: notifChannel,
      title: subject,
      body,
      status: notifStatus,
      metadata: meta,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      sentAt: opts.sentAt || (notifStatus === "delivered" ? now : undefined),
      error: opts.error || null,
    });

    let notifications = [];

    // For in_app, immediately insert as delivered
    if (channel === "in_app" || channel === "all") {
      const docs = recipients.map((teacher) => buildDoc(teacher._id, "in_app", "delivered"));
      const created = await Notification.insertMany(docs);
      notifications.push(...created);
    }

    // For email, send via SMTP
    if (channel === "email" || channel === "all") {
      const emailRecipients = recipients.filter(r => r.email);
      const emailResults = await sendBulkEmails({
        recipients: emailRecipients.map((r) => ({ _id: r._id, email: r.email, name: r.name })),
        subject,
        body,
      });

      const docs = emailResults.map((result) =>
        buildDoc(result.recipientId, "email", result.success ? "delivered" : "failed", {
          error: result.error || null,
          sentAt: result.success ? now : undefined
        })
      );
      const created = docs.length ? await Notification.insertMany(docs) : [];
      notifications.push(...created);
    }

    // For SMS/WhatsApp, send via Twilio
    if (channel === "sms" || channel === "whatsapp") {
      const twilioConf = await getTwilioConfig();

      if (!twilioConf) {
        const docs = recipients.map((teacher) =>
          buildDoc(teacher._id, channel, "failed", {
            error: `${channel.toUpperCase()} provider is not configured. Add Twilio credentials in Settings & Roles.`
          })
        );
        const created = docs.length ? await Notification.insertMany(docs) : [];
        notifications.push(...created);
      } else {
        const twilioBase = `https://api.twilio.com/2010-04-01/Accounts/${twilioConf.sid}/Messages.json`;
        const messageResults = await Promise.allSettled(
          recipients.map(async (r) => {
            if (!r.phone) return { recipientId: r._id, success: false, error: "No phone number on record" };
            const cleanPhone = normalizePhoneE164(r.phone);
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

        const results = messageResults.map((r, i) =>
          r.status === "fulfilled" ? r.value : { recipientId: recipients[i]?._id, success: false, error: r.reason?.message }
        );

        const docs = results.map((result) =>
          buildDoc(result.recipientId, channel, result.success ? "delivered" : "failed", {
            error: result.error || null,
            sentAt: result.success ? now : undefined
          })
        );
        const created = docs.length ? await Notification.insertMany(docs) : [];
        notifications.push(...created);
      }
    }

    res.status(201).json({ notifications, recipientCount: recipients.length });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/notifications/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Send email notification for course assignment
app.post("/api/admin/courses/:courseId/assign-with-email", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { teacherId, dueDate } = req.body;
    requireObjectId(req.params.courseId, "course id");
    requireObjectId(teacherId, "teacher id");

    const assignment = await CourseAssignment.findOneAndUpdate(
      { course: req.params.courseId, teacher: teacherId },
      { course: req.params.courseId, teacher: teacherId, assignedBy: req.user.id, dueDate, status: "assigned" },
      { upsert: true, new: true }
    );

    // Create in-app notification
    const notification = await Notification.create({
      recipient: teacherId,
      channel: "email",
      title: "New course assigned",
      body: "A training course has been assigned to your teacher portal.",
      status: "pending",
    });

    // Try to send email
    const { sendNotificationEmail } = await import("./email.js");
    const emailResult = await sendNotificationEmail({
      recipient: teacherId,
      title: "New Course Assigned",
      body: "A new training course has been assigned to you. Please log in to view and begin your training.",
    });

    console.log("[notification] course_assigned", JSON.stringify({
      courseId: req.params.courseId,
      teacherId,
      email: emailResult.success ? "sent" : "failed",
    }));

    res.status(201).json({ assignment, notification, emailSent: emailResult.success });
  } catch (error) {
    next(error);
  }
});

// Admin activities alias - returns all activities for admin monitoring
app.get("/api/admin/activities", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const activities = await ActivitySubmission.find()
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

// ==========================================
// AUTOMATION ENDPOINTS
// ==========================================

// Auto-send attendance reminders to teachers who haven't marked attendance today
app.post("/api/automation/attendance-reminders", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all approved teachers
    const allTeachers = await User.find({ role: "teacher", status: "approved" }).select("_id name email phone language");
    
    // Get teachers who already marked attendance today
    const attendedToday = await TeacherAttendanceRecord.find({
      attendanceDate: { $gte: today, $lte: new Date(today.getTime() + 86400000) }
    }).select("teacher");
    const attendedIds = new Set(attendedToday.map(r => r.teacher.toString()));

    // Filter teachers who haven't attended
    const pendingTeachers = allTeachers.filter(t => !attendedIds.has(t._id.toString()));

    if (pendingTeachers.length === 0) {
      return res.json({ message: "All teachers have marked attendance today!", sent: 0 });
    }

    // Send reminders via preferred channel
    const channel = req.body.channel || "in_app";
    const results = await broadcastNotification({
      recipientIds: pendingTeachers.map(t => t._id),
      templateKey: "attendance_reminder",
      channel,
      priority: "high",
      metadata: { automation: true, type: "attendance_reminder" },
    });

    console.log("[automation] attendance_reminders", JSON.stringify({ sent: results.success, pending: pendingTeachers.length }));

    res.json({
      message: `Attendance reminders sent to ${results.success} teachers`,
      totalPending: pendingTeachers.length,
      sent: results.success,
      failed: results.failed,
    });
  } catch (error) {
    next(error);
  }
});

// Auto-notify admin when teacher submits assignment
app.post("/api/automation/notify-assignment-submission", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const admins = await User.find({ role: "admin" }).select("_id");
    const teacher = await User.findById(req.user.id).select("name");

    for (const admin of admins) {
      await sendNotification({
        recipientId: admin._id,
        templateKey: "assignment_submitted",
        channel: "in_app",
        priority: "normal",
        replacements: { teacherName: teacher?.name || "A teacher" },
        metadata: { automation: true, teacherId: req.user.id },
      });
    }

    res.json({ success: true, message: "Admin notified of submission" });
  } catch (error) {
    next(error);
  }
});

// Auto-assign courses to teachers based on subject match
app.post("/api/automation/auto-assign-courses", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { courseId } = req.body;
    if (!courseId) return res.status(400).json({ message: "Course ID is required" });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    // Find teachers with matching subject or unassigned
    const teachers = await User.find({
      role: "teacher",
      status: "approved",
      $or: [
        { "teacherProfile.subject": { $regex: course.category || "", $options: "i" } },
        { "teacherProfile.subject": { $exists: false } },
      ],
    }).select("_id name email phone language");

    if (teachers.length === 0) {
      return res.json({ message: "No matching teachers found for this course", assigned: 0 });
    }

    let assignedCount = 0;
    for (const teacher of teachers) {
      const existing = await CourseAssignment.findOne({ course: courseId, teacher: teacher._id });
      if (!existing) {
        await CourseAssignment.create({
          course: courseId,
          teacher: teacher._id,
          assignedBy: req.user.id,
          status: "assigned",
          progressPercent: 0,
        });

        // Notify teacher
        await sendNotification({
          recipientId: teacher._id,
          templateKey: "course_assigned",
          channel: "all",
          priority: "normal",
          metadata: { automation: true, courseId },
        });

        assignedCount++;
      }
    }

    console.log("[automation] auto_assign_courses", JSON.stringify({ courseId, assigned: assignedCount }));

    res.json({
      message: `Course auto-assigned to ${assignedCount} teachers`,
      assigned: assignedCount,
      total: teachers.length,
    });
  } catch (error) {
    next(error);
  }
});

// Dashboard automation status
app.get("/api/automation/status", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalTeachers,
      attendedToday,
      pendingAssignments,
      unreadNotifications,
    ] = await Promise.all([
      User.countDocuments({ role: "teacher", status: "approved" }),
      TeacherAttendanceRecord.countDocuments({ attendanceDate: { $gte: today } }),
      CourseAssignment.countDocuments({ status: "assigned" }),
      Notification.countDocuments({ read: false }),
    ]);

    res.json({
      automationStatus: {
        attendanceReminders: {
          enabled: true,
          pending: totalTeachers - attendedToday,
          total: totalTeachers,
        },
        courseAssignments: {
          enabled: true,
          pending: pendingAssignments,
        },
        notifications: {
          enabled: true,
          unread: unreadNotifications,
        },
      },
      lastChecked: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════
// PHASE 1: USER MANAGEMENT — Auto Password, Bulk CSV Import, Restore
// ═══════════════════════════════════════════════════════════════════

function generateRandomPassword(length = 12) {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%";
  let pw = upper[Math.floor(Math.random() * upper.length)]
    + lower[Math.floor(Math.random() * lower.length)]
    + digits[Math.floor(Math.random() * digits.length)]
    + special[Math.floor(Math.random() * special.length)];
  const all = upper + lower + digits + special;
  for (let i = pw.length; i < length; i++) pw += all[Math.floor(Math.random() * all.length)];
  return pw.split("").sort(() => Math.random() - 0.5).join("");
}

app.post("/api/admin/users/import", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { users } = req.body;
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ message: "Provide a non-empty 'users' array." });
    }
    const results = [];
    for (const u of users) {
      try {
        if (!u.email || !u.name || !u.role) {
          results.push({ email: u.email || "?", success: false, error: "Missing required fields (name, email, role)" });
          continue;
        }
        const existing = await User.findOne({ email: u.email.toLowerCase().trim() });
        if (existing) {
          results.push({ email: u.email, success: false, error: "Email already exists" });
          continue;
        }
        const password = u.password || generateRandomPassword();
        const passwordHash = await hashPassword(password);
        const teacher = await User.create({
          name: u.name,
          email: u.email.toLowerCase().trim(),
          phone: u.phone || "",
          role: u.role || "teacher",
          passwordHash,
          status: "approved",
        });
        results.push({ email: u.email, success: true, userId: teacher._id, tempPassword: password });
      } catch (err) {
        results.push({ email: u.email || "?", success: false, error: err.message });
      }
    }
    res.json({ imported: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length, results });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/users/:id/restore", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.status !== "inactive" && user.status !== "rejected") {
      return res.status(400).json({ message: `User status is '${user.status}', cannot restore.` });
    }
    user.status = "approved";
    await user.save();
    res.json({ message: "User restored to active", user: { id: user._id, name: user.name, email: user.email, status: user.status } });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════
// PHASE 1: COURSE PUBLISHING WORKFLOW
// ═══════════════════════════════════════════════════════════════════

app.post("/api/courses/:id/publish", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (course.status === "published") return res.status(400).json({ message: "Course is already published" });
    course.status = "published";
    await course.save();
    res.json({ message: "Course published", course: { id: course._id, title: course.title, status: course.status } });
  } catch (error) {
    next(error);
  }
});

app.post("/api/courses/:id/archive", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    course.status = "archived";
    await course.save();
    res.json({ message: "Course archived", course: { id: course._id, title: course.title, status: course.status } });
  } catch (error) {
    next(error);
  }
});

app.post("/api/courses/:id/review", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    course.status = "draft";
    await course.save();
    res.json({ message: "Course sent back to draft for revision", course: { id: course._id, title: course.title, status: course.status } });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════
// PHASE 1: SCHEDULE CONFLICT DETECTION
// ═══════════════════════════════════════════════════════════════════

app.post("/api/schedules/check-conflicts", requireAuth, async (req, res, next) => {
  try {
    const { teacher, time, className, excludeId } = req.body;
    if (!teacher || !time) return res.status(400).json({ message: "teacher and time required" });
    const targetTime = new Date(time);
    const windowStart = new Date(targetTime.getTime() - 60 * 60 * 1000);
    const windowEnd = new Date(targetTime.getTime() + 60 * 60 * 1000);
    const q = { teacher, time: { $gte: windowStart, $lte: windowEnd } };
    if (excludeId) q._id = { $ne: excludeId };
    const conflicts = await Schedule.find(q).populate("teacher", "name email");
    res.json({ conflicts: conflicts.length > 0, schedules: conflicts });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════
// PHASE 1: SYSTEM HEALTH
// ═══════════════════════════════════════════════════════════════════

app.get("/api/admin/system-health", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const dbState = mongoose.connection.readyState;
    const dbStates = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
    const [totalUsers, totalTeachers, totalChildren, totalCourses, totalCenters, totalClasses, totalNotifications, totalSubmissions] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "teacher" }),
      Child.countDocuments(),
      Course.countDocuments(),
      Center.countDocuments(),
      ClassModel.countDocuments(),
      Notification.countDocuments(),
      ActivitySubmission.countDocuments(),
    ]);
    const recentErrors = [];
    res.json({
      status: "healthy",
      database: { state: dbStates[dbState] || "unknown", name: mongoose.connection.name || "spacECE" },
      counts: { users: totalUsers, teachers: totalTeachers, children: totalChildren, courses: totalCourses, centers: totalCenters, classes: totalClasses, notifications: totalNotifications, submissions: totalSubmissions },
      uptime: Math.floor(process.uptime()),
      memory: { used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), unit: "MB" },
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════
// PHASE 1: ADMIN PROFILE
// ═══════════════════════════════════════════════════════════════════

app.get("/api/admin/profile", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("name email phone photoUrl language status createdAt").lean();
    if (!user) return res.status(404).json({ message: "Admin not found" });
    res.json({ profile: user });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/profile", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { name, email, phone, photoUrl } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Admin not found" });
    if (name) user.name = name;
    if (email && email !== user.email) {
      const exists = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: user._id } });
      if (exists) return res.status(409).json({ message: "Email already in use" });
      user.email = email.toLowerCase().trim();
    }
    if (phone !== undefined) user.phone = phone;
    if (photoUrl !== undefined) user.photoUrl = photoUrl;
    await user.save();
    res.json({ message: "Profile updated", profile: { id: user._id, name: user.name, email: user.email, phone: user.phone, photoUrl: user.photoUrl } });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/profile/change-password", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: "Both currentPassword and newPassword required" });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Admin not found" });
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ message: "Current password is incorrect" });
    const policyCheck = await validatePasswordAgainstPolicy(newPassword);
    if (!policyCheck.valid) return res.status(400).json({ message: policyCheck.message });
    user.passwordHash = await hashPassword(newPassword);
    user.passwordChangedAt = new Date();
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════
// PHASE 2: NOTIFICATION ENGINE — Auto-triggers, History, Deadlines
// ═══════════════════════════════════════════════════════════════════

app.get("/api/admin/notifications/history", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { page = 1, limit = 50, type, read } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (read !== undefined) filter.read = read === "true";
    const total = await Notification.countDocuments(filter);
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    res.json({ notifications, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/notifications/auto-triggers/check", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const triggers = [];

    const pendingTeachers = await User.countDocuments({ role: "teacher", status: "approved" });
    const attendedToday = await TeacherAttendanceRecord.countDocuments({ attendanceDate: { $gte: today } });
    if (pendingTeachers - attendedToday > 0) {
      triggers.push({ type: "attendance_reminder", message: `${pendingTeachers - attendedToday} teachers haven't marked attendance today`, priority: "high" });
    }

    const pendingSubmissions = await ActivitySubmission.countDocuments({ status: "pending" });
    if (pendingSubmissions > 0) {
      triggers.push({ type: "submission_pending", message: `${pendingSubmissions} activity submissions awaiting review`, priority: "medium" });
    }

    const pendingAssignments = await CourseAssignment.countDocuments({ status: "assigned" });
    if (pendingAssignments > 0) {
      triggers.push({ type: "course_pending", message: `${pendingAssignments} course assignments not yet started`, priority: "low" });
    }

    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const overdueSubmissions = await ActivitySubmission.countDocuments({ status: "pending", activityDate: { $lt: sevenDaysAgo } });
    if (overdueSubmissions > 0) {
      triggers.push({ type: "overdue_activity", message: `${overdueSubmissions} activities are overdue by 7+ days`, priority: "high" });
    }

    res.json({ triggers, checkedAt: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/teacher/deadline-reminders", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const reminders = [];

    const pendingAssignments = await CourseAssignment.find({ teacher: userId, status: { $in: ["assigned", "in_progress"] } }).populate("course", "title").lean();
    for (const a of pendingAssignments) {
      if (a.deadline && new Date(a.deadline) <= threeDays) {
        reminders.push({ type: "assignment_deadline", title: a.course?.title || "Course Assignment", deadline: a.deadline, daysLeft: Math.ceil((new Date(a.deadline) - now) / 86400000) });
      }
    }

    const pendingLessons = await LessonPlanAssignment.find({ teacher: userId, status: { $in: ["pending", "in_progress"] } }).populate("lessonPlan", "title").lean();
    for (const lp of pendingLessons) {
      if (lp.lessonPlan?.date && new Date(lp.lessonPlan.date) <= threeDays) {
        reminders.push({ type: "lesson_plan_deadline", title: lp.lessonPlan.title || "Lesson Plan", deadline: lp.lessonPlan.date, daysLeft: Math.ceil((new Date(lp.lessonPlan.date) - now) / 86400000) });
      }
    }

    res.json({ reminders });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════
// PHASE 3: AI/ML — Sentiment Analysis, Risk Flags, Chatbot, Auto-grade
// ═══════════════════════════════════════════════════════════════════

const SENTIMENT_POSITIVE = ["great","excellent","amazing","wonderful","fantastic","good","love","happy","thank","best","awesome","perfect","nice","helpful","well done","keep up","impressed","outstanding","superb","brilliant","beautiful","creative","effective","engaging","inspiring","professional","quality","remarkable","satisfying","successful"];
const SENTIMENT_NEGATIVE = ["bad","terrible","awful","poor","worst","hate","angry","disappointed","frustrated","useless","boring","difficult","confusing","delayed","late","missing","incomplete","wrong","broken","failed","failure","problem","issue","complaint","unfair","stress","tired","overwhelmed","stressed","struggling"];

function analyzeSentiment(text) {
  if (!text) return { score: 0, label: "neutral", confidence: 0.5 };
  const lower = text.toLowerCase();
  const words = lower.split(/[\s,.'!?]+/).filter(Boolean);
  let posCount = 0, negCount = 0;
  for (const w of words) {
    if (SENTIMENT_POSITIVE.some(p => w.includes(p))) posCount++;
    if (SENTIMENT_NEGATIVE.some(n => w.includes(n))) negCount++;
  }
  const total = posCount + negCount || 1;
  const score = (posCount - negCount) / total;
  let label = "neutral";
  if (score > 0.2) label = "positive";
  else if (score < -0.2) label = "negative";
  return { score: Math.round(score * 100) / 100, label, confidence: Math.round((total / words.length) * 100) / 100 };
}

app.post("/api/ai/sentiment", requireAuth, async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "text required" });
    const result = analyzeSentiment(text);
    res.json({ sentiment: result });
  } catch (error) {
    next(error);
  }
});

const RISK_KEYWORDS = ["inappropriate","harmful","dangerous","offensive","violent","abuse","neglect","unsafe","illegal","discriminat","harass","bully","threat","weapon","drug","alcohol","self-harm","suicide"];
function detectRiskFlags(text, description) {
  const combined = `${text || ""} ${description || ""}`.toLowerCase();
  const flags = [];
  for (const kw of RISK_KEYWORDS) {
    if (combined.includes(kw)) flags.push({ keyword: kw, severity: "high" });
  }
  return { flagged: flags.length > 0, flags, riskLevel: flags.length > 2 ? "critical" : flags.length > 0 ? "high" : "low" };
}

app.post("/api/ai/risk-flags", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { text, description } = req.body;
    const result = detectRiskFlags(text, description);
    res.json({ riskFlags: result });
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/auto-grade", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { assessmentId, answers } = req.body;
    if (!assessmentId || !answers) return res.status(400).json({ message: "assessmentId and answers required" });
    const result = await AssessmentResult.findById(assessmentId);
    if (!result) return res.status(404).json({ message: "Assessment not found" });
    let correct = 0, total = answers.length;
    for (const a of answers) {
      const existing = result.answers.find(e => e.questionId === a.questionId);
      if (existing) {
        const isCorrect = existing.correctOption === a.chosenOption;
        existing.chosenOption = a.chosenOption;
        existing.isCorrect = isCorrect;
        if (isCorrect) correct++;
      }
    }
    result.correctAnswers = correct;
    result.wrongAnswers = total - correct;
    result.score = correct;
    result.percentage = Math.round((correct / total) * 100);
    result.grade = result.percentage >= 90 ? "A+" : result.percentage >= 80 ? "A" : result.percentage >= 70 ? "B+" : result.percentage >= 60 ? "B" : result.percentage >= 50 ? "C" : "F";
    result.status = result.percentage >= 50 ? "passed" : "failed";
    await result.save();
    res.json({ graded: true, score: result.score, percentage: result.percentage, grade: result.grade, status: result.status });
  } catch (error) {
    next(error);
  }
});

const CHATBOT_RESPONSES = {
  "attendance": "To mark attendance, go to Daily Attendance tab, select the date, and mark each child as Present/Absent.",
  "lesson plan": "Lesson Plans are in the Training & Lessons tab. You can view upcoming plans and mark them as complete.",
  "password": "To change your password, go to My Profile > Change Password.",
  "certificate": "Certificates are available in the Certificates tab. You can download them after completing a course.",
  "schedule": "Your schedule is in the Schedule tab. It shows all upcoming classes and activities.",
  "feedback": "You can submit feedback in the Feedback tab. We appreciate your honest input!",
  "course": "Your assigned courses are in the My Courses tab. Complete all activities to finish a course.",
  "assessment": "Assessments are in the Assessments tab. Complete quizzes and exams to earn grades.",
  "help": "I can help with: attendance, lesson plans, passwords, certificates, schedules, feedback, courses, and assessments. Ask me anything!",
  "hello": "Hello! I'm your AI assistant. How can I help you today?",
  "hi": "Hi there! What can I help you with?",
  "thank": "You're welcome! Let me know if you need anything else.",
  "bye": "Goodbye! Have a great day teaching!",
};

app.post("/api/teacher/chatbot/enhanced", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: "message required" });
    const lower = message.toLowerCase().trim();
    let bestMatch = null;
    let bestScore = 0;
    for (const [keyword, response] of Object.entries(CHATBOT_RESPONSES)) {
      if (lower.includes(keyword)) {
        const score = keyword.length / lower.length;
        if (score > bestScore) { bestScore = score; bestMatch = response; }
      }
    }
    if (!bestMatch) {
      const words = lower.split(/\s+/);
      for (const [keyword, response] of Object.entries(CHATBOT_RESPONSES)) {
        for (const word of words) {
          if (word.includes(keyword) || keyword.includes(word)) {
            bestMatch = response;
            break;
          }
        }
        if (bestMatch) break;
      }
    }
    if (!bestMatch) bestMatch = "I'm not sure I understand. Try asking about: attendance, lesson plans, passwords, certificates, schedules, feedback, courses, or assessments.";
    res.json({ reply: bestMatch, timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  void _next;
  console.error(error);
  if (error.name === "CastError") {
    return res.status(400).json({ message: `Invalid ${error.path || "id"} supplied.` });
  }
  if (error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: "A record with these unique fields already exists." });
  }
  res.status(error.status || 500).json({
    message: error.status ? error.message : "Server error",
    ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}),
  });
});

await connectDb();
await ensureDatabaseReady();

const server = http.createServer(app);

// Initialize Socket.IO for real-time communication
const io = initSocket(server);


server.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Another backend server is probably already running.`);
    console.error(`Use the existing API at http://localhost:${port}, stop the old process, or start this server with a different PORT value.`);
    process.exit(1);
  }

  console.error("Failed to start API server:", error);
  process.exit(1);
});
