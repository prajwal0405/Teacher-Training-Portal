import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  grade: { type: String },
  status: { type: String, enum: ["active", "inactive", "suspended"], default: "active" },
  enrollmentDate: { type: Date, default: Date.now },
  totalClasses: { type: Number, default: 0 },
  attendedClasses: { type: Number, default: 0 },
  averageGrade: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const Student = mongoose.model("Student", StudentSchema);
export default Student;
