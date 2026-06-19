import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  title: { type: String, required: true },
  description: { type: String },
  dueDate: { type: Date, required: true },
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  status: { type: String, enum: ["pending", "in-progress", "completed"], default: "pending" },
  category: { type: String }, // e.g., "grading", "lesson-planning", "assessment"
  relatedTo: { type: String }, // course, assignment, etc.
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const Task = mongoose.model("Task", TaskSchema);
export default Task;
