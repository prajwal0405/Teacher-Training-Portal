import express from "express";
import { Certificate } from "../models/Certificate.js";
import { CourseAssignment } from "../models/CourseAssignment.js";
import { User } from "../models/User.js";
import { requireAuth, requireRole } from "../auth.js";

const router = express.Router();

// Teacher: get my certificates
router.get("/teacher", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const certs = await Certificate.find({ teacher: req.user.id })
      .populate("course", "title duration category")
      .populate("issuedBy", "name")
      .sort({ issuedAt: -1 });
    res.json({ certificates: certs });
  } catch (err) {
    next(err);
  }
});

// Admin: get all certificates
router.get("/admin", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const certs = await Certificate.find()
      .populate("teacher", "name email")
      .populate("course", "title")
      .populate("issuedBy", "name")
      .sort({ issuedAt: -1 });
    res.json({ certificates: certs });
  } catch (err) {
    next(err);
  }
});

// Admin: generate certificate for teacher after course completion
router.post("/generate", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { teacherId, courseId, assignmentId, score, grade, googleFormUrl } = req.body;
    if (!teacherId || !courseId) {
      return res.status(400).json({ message: "teacherId and courseId are required" });
    }

    // Check if certificate already exists
    const existing = await Certificate.findOne({ teacher: teacherId, course: courseId });
    if (existing) {
      return res.status(409).json({ message: "Certificate already exists for this teacher and course", certificate: existing });
    }

    const teacher = await User.findById(teacherId).select("name email");
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    // Generate certificate number
    const count = await Certificate.countDocuments();
    const certNumber = `SPC-${String(count + 1).padStart(5, "0")}-${String(Date.now()).slice(-4)}`;

    // Compute grade if not provided
    let finalGrade = grade || "Pass";
    if (score !== undefined && !grade) {
      if (score >= 90) finalGrade = "A+";
      else if (score >= 80) finalGrade = "A";
      else if (score >= 70) finalGrade = "B+";
      else if (score >= 60) finalGrade = "B";
      else finalGrade = "Pass";
    }

    const certificate = await Certificate.create({
      certificateNumber: certNumber,
      teacher: teacherId,
      course: courseId,
      assignment: assignmentId || undefined,
      issuedBy: req.user.id,
      score: score || undefined,
      grade: finalGrade,
      status: "issued",
      issuedAt: new Date(),
      metadata: {
        ...(googleFormUrl ? { googleFormUrl } : {}),
      }
    });

    res.status(201).json({ certificate });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Certificate already exists" });
    }
    next(error);
  }
});

// Admin: automatically generate certificate when a course is completed
router.post("/auto-generate/:assignmentId", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const assignment = await CourseAssignment.findById(req.params.assignmentId)
      .populate("course", "title")
      .populate("teacher", "_id name email");

    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    if (assignment.status !== "completed" && assignment.progressPercent !== 100) {
      // Allow admin to force-generate if desired
      if (!req.body.force) {
        return res.status(400).json({ message: "Course is not completed yet. Mark it completed first or use force=true." });
      }
    }

    const existing = await Certificate.findOne({
      teacher: assignment.teacher._id,
      course: assignment.course._id
    });
    if (existing) {
      return res.status(409).json({ message: "Certificate already exists", certificate: existing });
    }

    const count = await Certificate.countDocuments();
    const certNumber = `SPC-${String(count + 1).padStart(5, "0")}-${String(Date.now()).slice(-4)}`;

    const certificate = await Certificate.create({
      certificateNumber: certNumber,
      teacher: assignment.teacher._id,
      course: assignment.course._id,
      assignment: assignment._id,
      issuedBy: req.user.id,
      score: assignment.score || undefined,
      status: "issued",
      issuedAt: new Date(),
    });

    res.status(201).json({ certificate });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Certificate already exists" });
    }
    next(error);
  }
});

// Admin: revoke certificate
router.patch("/:id/revoke", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const cert = await Certificate.findByIdAndUpdate(
      req.params.id,
      { status: "revoked" },
      { new: true }
    );
    if (!cert) return res.status(404).json({ message: "Certificate not found" });
    res.json({ certificate: cert });
  } catch (err) {
    next(err);
  }
});

// Verify certificate by number (public)
router.get("/verify/:certNumber", async (req, res, next) => {
  try {
    const cert = await Certificate.findOne({ 
      certificateNumber: req.params.certNumber.toUpperCase(),
      status: "issued"
    })
      .populate("teacher", "name email")
      .populate("course", "title duration category")
      .populate("issuedBy", "name");
    
    if (!cert) {
      return res.status(404).json({ valid: false, message: "Certificate not found or has been revoked" });
    }
    res.json({ valid: true, certificate: cert });
  } catch (err) {
    next(err);
  }
});

export default router;
