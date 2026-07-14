/**
 * courseLibrary.routes.js
 * ----------------------------------------------------------------------
 * Wire this into your existing Express app:
 *
 *   const courseLibraryRouter = require("./routes/courseLibrary.routes");
 *   app.use("/api", courseLibraryRouter);
 *
 * Assumes (adjust import paths to match your project):
 *   - an auth middleware `requireAuth` that sets `req.user = { id, role, name }`
 *   - a Mongoose `Course` model with fields: title, category, level, duration,
 *     description, objectives, contentType, modules[], libraryId
 *     (modules[].contents[] holds { title, type:"reading", notes, order })
 *   - a Mongoose `CourseAssignment` model with fields: teacher, course,
 *     status, progressPercent, completedContent[], dueDate
 *   - a Mongoose `Teacher` model
 *
 * If your actual models differ, keep the routes/response shapes below
 * (the frontend code depends on these) and adjust only the DB calls.
 * ---------------------------------------------------------------------- */
const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// ---- Load the parsed course library (regenerate via parseCourseLibrary.js
//      whenever PreSchool_Teacher_Courses.docx is edited) ----------------
const LIBRARY_PATH = path.join(__dirname, "courseLibrary.json");
const ASSESSMENT_PATH = path.join(__dirname, "assessmentBank.json");

function loadLibrary() {
  const raw = fs.readFileSync(LIBRARY_PATH, "utf-8");
  return JSON.parse(raw).courses;
}
function loadAssessmentBank() {
  return JSON.parse(fs.readFileSync(ASSESSMENT_PATH, "utf-8"));
}

// ────────────────────────────────────────────────────────────
// GET /api/course-library
// Returns the 10 pre-primary courses parsed from the .docx source,
// for the admin "Select from Course Library" dropdown.
// ────────────────────────────────────────────────────────────
router.get("/course-library", (req, res) => {
  try {
    const courses = loadLibrary();
    // Send a lightweight summary list; full topic notes come with /course-library/:id
    res.json({
      courses: courses.map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        level: c.level,
        duration: c.duration,
        description: c.description,
        objectives: c.objectives,
        color: c.color,
        topicCount: c.topics.length,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load course library.", error: err.message });
  }
});

router.get("/course-library/:libraryId", (req, res) => {
  try {
    const courses = loadLibrary();
    const found = courses.find((c) => c.id === req.params.libraryId);
    if (!found) return res.status(404).json({ message: "Course not found in library." });
    res.json({ course: found });
  } catch (err) {
    res.status(500).json({ message: "Failed to load course.", error: err.message });
  }
});

// ────────────────────────────────────────────────────────────
// POST /api/courses/from-library
// body: { libraryId }
// Creates a real Course document, with modules/topics + notes copied
// from the library entry (so any Course, CourseAssignment, CourseNote
// logic you already have keeps working unchanged).
// ────────────────────────────────────────────────────────────
function makeFromLibraryHandler(Course) {
  return async (req, res) => {
    try {
      const { libraryId } = req.body;
      if (!libraryId) return res.status(400).json({ message: "libraryId is required." });
      const courses = loadLibrary();
      const lib = courses.find((c) => c.id === libraryId);
      if (!lib) return res.status(404).json({ message: "Course not found in library." });

      const modules = lib.topics.map((topic, idx) => ({
        title: topic.title,
        description: "",
        contents: [
          {
            title: topic.title,
            type: "reading",
            notes: topic.notes,
            suggestedDuration: `${Math.max(10, Math.round(topic.notes.split(" ").length / 130) * 5)} min read`,
            order: idx,
          },
        ],
      }));

      const course = await Course.create({
        title: lib.title,
        category: lib.category,
        level: lib.level,
        duration: lib.duration,
        durationText: lib.duration,
        description: lib.description,
        objectives: lib.objectives,
        contentType: "Notes",
        libraryId: lib.id,
        modules,
      });

      res.json({ course });
    } catch (err) {
      res.status(500).json({ message: "Failed to create course from library.", error: err.message });
    }
  };
}

// ────────────────────────────────────────────────────────────
// Assessment result persistence — so admin can see teacher scores.
// Adjust to a real Mongoose model (`AssessmentResult`) in production;
// shown here with the model injected so this file has no hard DB import.
// ────────────────────────────────────────────────────────────
function makeSubmitAssessmentHandler(AssessmentResult) {
  return async (req, res) => {
    try {
      const teacherId = req.user?.id || req.body.teacherId;
      const {
        courseId, courseTitle, score, total, percentage, grade,
        performance, strengths, improvements, recommendation,
        correct, wrong, unanswered, warnings, forced, answers,
      } = req.body;

      const doc = await AssessmentResult.create({
        teacher: teacherId,
        course: courseId,
        courseTitle,
        score, total, percentage, grade,
        performance, strengths, improvements, recommendation,
        correct, wrong, unanswered, warnings: warnings || 0, forced: !!forced,
        answers: answers || {},
        submittedAt: new Date(),
      });

      res.json({ result: doc });
    } catch (err) {
      res.status(500).json({ message: "Failed to save assessment result.", error: err.message });
    }
  };
}

function makeTeacherAssessmentsHandler(AssessmentResult) {
  return async (req, res) => {
    try {
      const teacherId = req.user?.id || req.query.teacherId;
      const results = await AssessmentResult.find({ teacher: teacherId }).sort({ submittedAt: -1 });
      res.json({ results });
    } catch (err) {
      res.status(500).json({ message: "Failed to load assessment results.", error: err.message });
    }
  };
}

function makeAdminAssessmentsHandler(AssessmentResult) {
  return async (req, res) => {
    try {
      const results = await AssessmentResult.find({})
        .populate("teacher", "name email")
        .populate("course", "title category")
        .sort({ submittedAt: -1 });
      res.json({ results });
    } catch (err) {
      res.status(500).json({ message: "Failed to load assessment results.", error: err.message });
    }
  };
}

// ────────────────────────────────────────────────────────────
// GET /api/assessment-bank/:libraryId
// Returns the MCQ bank for a course, matched by library id.
// ────────────────────────────────────────────────────────────
router.get("/assessment-bank/:libraryId", (req, res) => {
  try {
    const bank = loadAssessmentBank();
    const questions = bank[req.params.libraryId];
    if (!questions) return res.status(404).json({ message: "No assessment found for this course." });
    res.json({ questions });
  } catch (err) {
    res.status(500).json({ message: "Failed to load assessment.", error: err.message });
  }
});

/**
 * Call this from your main server file to attach the DB-backed routes,
 * passing your real Mongoose models:
 *
 *   const { attachCourseLibraryRoutes } = require("./routes/courseLibrary.routes");
 *   attachCourseLibraryRoutes(app, { Course, AssessmentResult, requireAuth });
 */
function attachCourseLibraryRoutes(app, { Course, AssessmentResult, requireAuth }) {
  app.use("/api", router);
  app.post("/api/courses/from-library", requireAuth, makeFromLibraryHandler(Course));
  app.post("/api/assessments", requireAuth, makeSubmitAssessmentHandler(AssessmentResult));
  app.get("/api/assessments/mine", requireAuth, makeTeacherAssessmentsHandler(AssessmentResult));
  app.get("/api/admin/assessments", requireAuth, makeAdminAssessmentsHandler(AssessmentResult));
}

module.exports = { router, attachCourseLibraryRoutes, loadLibrary, loadAssessmentBank };
