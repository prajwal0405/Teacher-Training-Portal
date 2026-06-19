import mongoose from "mongoose";

const GradeSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  assessmentName: { type: String, required: true },
  score: { type: Number, required: true },
  maxScore: { type: Number, default: 100 },
  percentage: { type: Number },
  grade: { type: String }, // A, B, C, D, F
  feedback: { type: String },
  dateGraded: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const Grade = mongoose.model("Grade", GradeSchema);
export default Grade;
