import mongoose from "mongoose";

const AssignmentSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  title: { type: String, required: true },
  description: { type: String },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ["pending", "active", "completed", "revision"], default: "pending" },
  totalMarks: { type: Number, default: 100 },
  submittedCount: { type: Number, default: 0 },
  totalStudents: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const Assignment = mongoose.model("Assignment", AssignmentSchema);
export default Assignment;
