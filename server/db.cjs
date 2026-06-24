const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://team_access:spacecefoundation@spacece-newsletter.mtyenck.mongodb.net/spacece_teacher_training?appName=spacece-newsletter";

// ── EXISTING SCHEMAS ──

const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
  subject: { type: String, default: "" },
  qualification: { type: String, default: "" },
  experience: { type: String, default: "" },
  photo: { type: String, default: "" },
  password: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  joined: { type: String, default: "" },
  attendance: { type: Number, default: 0 },
  classes: { type: Number, default: 0 },
  students: { type: Number, default: 0 },
  batch: { type: String, default: "" },
  course: { type: String, default: "" },
  revenue: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  // ── NEW: Attendance system link ──
  teacherProfile: {
    center: { type: mongoose.Schema.Types.ObjectId, ref: "Center" },
    class:  { type: mongoose.Schema.Types.ObjectId, ref: "CenterClass" }
  }
});
const Teacher = mongoose.model("Teacher", teacherSchema);

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "admin" }
});
const Admin = mongoose.model("Admin", adminSchema);

// ── NEW SCHEMAS (Attendance System) ──

const centerSchema = new mongoose.Schema({
  name: { type: String, required: true }
}, { timestamps: true });
const Center = mongoose.model("Center", centerSchema);

const classSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  ageGroup:  { type: String, default: "" },
  center:    { type: mongoose.Schema.Types.ObjectId, ref: "Center" },
  teacher:   { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" }
}, { timestamps: true });
const CenterClass = mongoose.model("CenterClass", classSchema);

const childSchema = new mongoose.Schema({
  fullName:  { type: String, required: true },
  name:      { type: String, default: "" },
  rollNo:    { type: String, default: "N/A" },
  classId:   { type: mongoose.Schema.Types.ObjectId, ref: "CenterClass" },
  centerId:  { type: mongoose.Schema.Types.ObjectId, ref: "Center" },
  status:    { type: String, enum: ["active", "inactive"], default: "active" }
}, { timestamps: true });
const Child = mongoose.model("Child", childSchema);

const attendanceSessionSchema = new mongoose.Schema({
  date:    { type: String, required: true },
  class:   { type: mongoose.Schema.Types.ObjectId, ref: "CenterClass" },
  center:  { type: mongoose.Schema.Types.ObjectId, ref: "Center" },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
  records: [{
    child:  { type: mongoose.Schema.Types.ObjectId, ref: "Child" },
    status: { type: String, enum: ["present", "absent", "late"], default: "present" }
  }]
}, { timestamps: true });
const AttendanceSession = mongoose.model("AttendanceSession", attendanceSessionSchema);

// ── connectDB helper (used by server.cjs) ──
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");
  } catch (e) {
    console.error("MongoDB error:", e.message);
    process.exit(1);
  }
};
// ===== LESSON PLANS SCHEMAS =====

const lessonPlanSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  title: { type: String, required: true },
  objectives: { type: String },
  activities: { type: String },
  instructions: { type: String },
  resources: { type: String },
  scheduleDate: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
}, { timestamps: true });

const lessonPlanAssignmentSchema = new mongoose.Schema({
  lessonPlan: { type: mongoose.Schema.Types.ObjectId, ref: "LessonPlan" },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
  center: { type: mongoose.Schema.Types.ObjectId, ref: "Center" },
  class: { type: mongoose.Schema.Types.ObjectId, ref: "CenterClass" },
  assignedDate: { type: Date },
  status: { type: String, enum: ["pending", "completed"], default: "pending" },
}, { timestamps: true });

const lessonCompletionReportSchema = new mongoose.Schema({
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: "LessonPlanAssignment" },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
  teachingNotes: { type: String },
  activityDescription: { type: String },
  files: [{ type: String }],
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
}, { timestamps: true });

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: String,
  description: String,
  durationText: String,
  level: String,
  modules: [{ type: mongoose.Schema.Types.Mixed }],
  objectives: String,
  status: { type: String, default: "published" },
  topic: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
}, { timestamps: true });

const Course = mongoose.model("Course", courseSchema);

const LessonPlan = mongoose.models.LessonPlan || mongoose.model("LessonPlan", lessonPlanSchema);
const LessonPlanAssignment = mongoose.models.LessonPlanAssignment || mongoose.model("LessonPlanAssignment", lessonPlanAssignmentSchema);
const LessonCompletionReport = mongoose.models.LessonCompletionReport || mongoose.model("LessonCompletionReport", lessonCompletionReportSchema);
module.exports = { mongoose, connectDB, Teacher, Admin, Center, CenterClass, Child, AttendanceSession, LessonPlan, LessonPlanAssignment, LessonCompletionReport, Course };