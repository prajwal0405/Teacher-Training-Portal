import express from "express";
import { Grade } from "../models/Grade.js";
import { User } from "../models/User.js";
import { PortalSetting } from "../models/PortalSetting.js";
import { requireAuth, requireRole } from "../auth.js";

const router = express.Router();

async function computeLetter(score, maxScore = 100) {
  if (score === null || score === undefined) return "";
  const pct = (Number(score) / Number(maxScore)) * 100;
  
  // Load grading thresholds from settings
  try {
    const keys = ["gradeAPlus", "gradeA", "gradeBPlus", "gradeB"];
    const docs = await PortalSetting.find({ key: { $in: keys } });
    const thresholds = { gradeAPlus: 90, gradeA: 80, gradeBPlus: 70, gradeB: 60 };
    docs.forEach((doc) => {
      if (doc.value !== undefined && doc.value !== null) {
        thresholds[doc.key] = Number(doc.value) || thresholds[doc.key];
      }
    });
    if (pct >= thresholds.gradeAPlus) return "A+";
    if (pct >= thresholds.gradeA) return "A";
    if (pct >= thresholds.gradeBPlus) return "B+";
    if (pct >= thresholds.gradeB) return "B";
    return "C";
  } catch {
    if (pct >= 90) return "A+";
    if (pct >= 80) return "A";
    if (pct >= 70) return "B+";
    if (pct >= 60) return "B";
    return "C";
  }
}

// Teacher: list grades for their students
router.get("/teacher", requireAuth, async (req, res, next) => {
  try {
    const grades = await Grade.find({ teacher: req.user.id })
      .populate("child", "fullName rollNo")
      .sort({ createdAt: -1 });
    res.json({ grades });
  } catch (err) {
    next(err);
  }
});

// Teacher: get their OWN grades (grades assigned to them by admin)
router.get("/teacher/my-grades", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    // Find grades where this teacher is the subject (teacherProfile matches)
    // Or more practically, return CourseAssignment scores as teacher grades
    const { CourseAssignment } = await import("../models/CourseAssignment.js");
    const assignments = await CourseAssignment.find({ teacher: req.user.id })
      .populate("course", "title category level")
      .select("course score status feedback reviewedAt rubric title")
      .sort({ reviewedAt: -1 });
    
    const grades = assignments
      .filter(a => a.score !== null && a.score !== undefined)
      .map(a => ({
        _id: a._id,
        subject: a.course?.title || a.title || "Assignment",
        assignmentName: a.course?.category || "Course",
        score: a.score,
        maxScore: 100,
        grade: a.score >= 90 ? "A+" : a.score >= 80 ? "A" : a.score >= 70 ? "B+" : a.score >= 60 ? "B" : "C",
        remarks: a.feedback || "",
        createdAt: a.reviewedAt || a.createdAt,
        updatedAt: a.updatedAt,
      }));

    res.json({ grades });
  } catch (err) {
    next(err);
  }
});

// Admin: list all grades
router.get("/admin", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const grades = await Grade.find()
      .populate("child", "fullName rollNo")
      .populate("teacher", "name email")
      .sort({ createdAt: -1 });
    res.json({ grades });
  } catch (err) {
    next(err);
  }
});

// Create grade (teacher or admin)
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { child, teacher: teacherId, subject, assignmentName, score, maxScore = 100, remarks } = req.body;
    if (!child) return res.status(400).json({ message: "child is required" });

    const gradeValue = computeLetter(score, maxScore);
    // Admin can assign grade for any teacher; teacher can only assign for themselves
    const targetTeacher = req.user.role === "admin" ? (teacherId || req.user.id) : req.user.id;

    const doc = await Grade.create({
      child,
      teacher: targetTeacher,
      subject,
      assignmentName,
      score,
      maxScore,
      grade: gradeValue,
      remarks,
    });

    res.status(201).json({ grade: doc });
  } catch (err) {
    next(err);
  }
});

// Update grade
router.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const g = await Grade.findById(req.params.id);
    if (!g) return res.status(404).json({ message: "Grade not found" });
    if (req.user.role !== "admin" && g.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { score, maxScore, subject, assignmentName, remarks } = req.body;
    if (score !== undefined) g.score = score;
    if (maxScore !== undefined) g.maxScore = maxScore;
    if (subject !== undefined) g.subject = subject;
    if (assignmentName !== undefined) g.assignmentName = assignmentName;
    if (remarks !== undefined) g.remarks = remarks;

    if (score !== undefined || maxScore !== undefined) {
      g.grade = computeLetter(g.score, g.maxScore);
    }

    await g.save();
    res.json({ grade: g });
  } catch (err) {
    next(err);
  }
});

// Delete grade
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const g = await Grade.findById(req.params.id);
    if (!g) return res.status(404).json({ message: "Grade not found" });
    if (req.user.role !== "admin" && g.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    await Grade.deleteOne({ _id: g._id });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
