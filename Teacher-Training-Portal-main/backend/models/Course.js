import mongoose from "mongoose";

const CourseSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  name: { type: String, required: true },
  description: { type: String },
  duration: { type: String }, // e.g., "4 weeks"
  modules: { type: Number, default: 0 },
  completedModules: { type: Number, default: 0 },
  students: { type: Number, default: 0 },
  progress: { type: Number, default: 0 }, // percentage
  status: { type: String, enum: ["ongoing", "completed", "pending"], default: "ongoing" },
  nextDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const Course = mongoose.model("Course", CourseSchema);
export default Course;
