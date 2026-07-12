const mongoose = require("mongoose");

const AssessmentResultSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true, index: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" }, // optional link to the real Course doc
  courseTitle: { type: String, required: true },
  score: { type: Number, required: true },
  total: { type: Number, required: true },
  percentage: { type: Number, required: true },
  grade: { type: String, required: true },
  performance: String,
  strengths: [String],
  improvements: [String],
  recommendation: String,
  correct: Number,
  wrong: Number,
  unanswered: Number,
  warnings: { type: Number, default: 0 },
  forced: { type: Boolean, default: false },
  answers: { type: mongoose.Schema.Types.Mixed, default: {} },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.models.AssessmentResult || mongoose.model("AssessmentResult", AssessmentResultSchema);
