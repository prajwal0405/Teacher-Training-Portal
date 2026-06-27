import express from "express";
import { Grade } from "../models/Grade.js";
import { Child } from "../models/Child.js";
import { requireAuth, requireRole } from "../auth.js";

const router = express.Router();

function computeLetter(score, maxScore = 100) {
  if (score === null || score === undefined) return "";
  const pct = (Number(score) / Number(maxScore)) * 100;
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  return "C";
}

// Teacher: list grades for their students
router.get("/teacher", requireAuth, async (req, res, next) => {
  try {
    const grades = await Grade.find({ teacher: req.user.id }).populate("child", "fullName rollNo").sort({ createdAt: -1 });
    res.json({ grades });
  } catch (err) {
    next(err);
  }
});

// Admin: list all grades
router.get("/admin", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const grades = await Grade.find().populate("child", "fullName rollNo").sort({ createdAt: -1 });
    res.json({ grades });
  } catch (err) {
    next(err);
  }
});

// Create grade (teacher or admin)
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { child, subject, assignmentName, score, maxScore = 100, remarks } = req.body;
    if (!child) return res.status(400).json({ message: "child is required" });

    const gradeValue = computeLetter(score, maxScore);

    const doc = await Grade.create({
      child,
      teacher: req.user.id,
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

// Update grade (teacher can update own, admin can update any)
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
