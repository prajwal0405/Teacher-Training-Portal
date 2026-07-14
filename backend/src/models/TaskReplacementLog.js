import mongoose from "mongoose";

const TaskReplacementLogSchema = new mongoose.Schema({
  assignmentDate: String,
  level: String,
  className: String,
  oldTeacherId: String,
  oldTeacherName: String,
  newTeacherId: String,
  newTeacherName: String,
  reason: String,
  transferredTaskCount: Number,
  transferredTasks: [String],
  replacedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const TaskReplacementLog = mongoose.models.TaskReplacementLog || mongoose.model("TaskReplacementLog", TaskReplacementLogSchema);
export default TaskReplacementLog;
