import puppeteer from "puppeteer";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Certificate } from "../models/Certificate.js";
import { CourseAssignment } from "../models/CourseAssignment.js";
import { User } from "../models/User.js";
import { requireAuth, requireRole } from "../auth.js";

const router = express.Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logoBase64 = fs.readFileSync(path.join(__dirname, "../assets/logo.png")).toString("base64");
const logoDataUri = `data:image/png;base64,${logoBase64}`;

export async function autoIssueCertificateForAssignment(assignmentId) {
  const assignment = await CourseAssignment.findById(assignmentId)
    .populate("course", "title")
    .populate("teacher", "_id name email");

  if (!assignment || !assignment.course || !assignment.teacher) return null;

  const existing = await Certificate.findOne({
    teacher: assignment.teacher._id,
    course: assignment.course._id,
  });
  if (existing) return existing;

  const count = await Certificate.countDocuments();
  const certNumber = `SPC-${String(count + 1).padStart(5, "0")}-${String(Date.now()).slice(-4)}`;

  let grade = "Pass";
  const score = assignment.score;
  if (score !== null && score !== undefined) {
    if (score >= 90) grade = "A+";
    else if (score >= 80) grade = "A";
    else if (score >= 70) grade = "B+";
    else if (score >= 60) grade = "B";
    else grade = "Pass";
  }

  try {
    const certificate = await Certificate.create({
      certificateNumber: certNumber,
      teacher: assignment.teacher._id,
      course: assignment.course._id,
      assignment: assignment._id,
      issuedBy: assignment.assignedBy || undefined,
      score: score ?? undefined,
      grade,
      status: "issued",
      issuedAt: new Date(),
    });
    return certificate;
  } catch (err) {
    if (err.code === 11000) return existing;
    throw err;
  }
}

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

// Teacher (or admin) — download certificate as a PDF
router.get("/:id/pdf", requireAuth, async (req, res, next) => {
  try {
    const cert = await Certificate.findById(req.params.id)
      .populate("teacher", "name")
      .populate("course", "title");

    if (!cert) return res.status(404).json({ message: "Certificate not found" });

    if (req.user.role === "teacher" && String(cert.teacher._id) !== String(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const dateStr = new Date(cert.issuedAt).toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    });

    const html = `
    <html>
    <head>
      <style>
        @page { size: A4 landscape; margin: 0; }
        body { margin: 0; font-family: 'Georgia', serif; }
        .cert {
          width: 1100px; height: 780px; box-sizing: border-box;
          padding: 50px; border: 14px solid #d97706; outline: 2px solid #d97706;
          outline-offset: -30px;
          text-align: center; background: linear-gradient(135deg,#fffbeb,#ffffff);
          position: relative;
        }
        .logo { width: 150px; height: auto; position: absolute; top: 40px; left: 60px; }
        .brand { font-size: 20px; font-weight: 700; color: #92400e; letter-spacing: 3px; margin-top: 0; }
        .title { font-size: 46px; font-weight: 900; color: #1c1917; margin: 30px 0 10px; }
        .sub { font-size: 16px; color: #6b7280; }
        .name { font-size: 38px; font-weight: 800; color: #d97706; margin: 25px 0; border-bottom: 2px solid #fbbf24; display: inline-block; padding-bottom: 8px; }
        .course { font-size: 22px; color: #1c1917; margin: 10px 0 30px; font-weight: 600; }
        .meta { display: flex; justify-content: space-between; margin-top: 60px; padding: 0 60px; }
        .meta div { font-size: 13px; color: #6b7280; }
        .meta b { display: block; font-size: 15px; color: #1c1917; margin-top: 4px; }
      </style>
    </head>
    <body>
      <div class="cert">
        <img class="logo" src="${logoDataUri}" alt="SpacECE Logo" />
        <div class="brand">SPACECE TEACHER TRAINING PORTAL</div>
        <div class="title">Certificate of Completion</div>
        <div class="sub">This certifies that</div>
        <div class="name">${cert.teacher?.name || "Teacher"}</div>
        <div class="sub">has successfully completed the course</div>
        <div class="course">${cert.course?.title || "Course"}</div>
        <div class="meta">
          <div>Certificate No.<b>${cert.certificateNumber}</b></div>
          <div>Grade<b>${cert.grade || "Pass"}</b></div>
          <div>Date Issued<b>${dateStr}</b></div>
        </div>
      </div>
    </body>
    </html>`;

    const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfUint8 = await page.pdf({ format: "A4", landscape: true, printBackground: true });
    const pdfBuffer = Buffer.from(pdfUint8);
    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Certificate-${cert.certificateNumber}.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

export default router;