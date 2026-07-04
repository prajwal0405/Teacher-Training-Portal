import mongoose from "mongoose";

const TaskItemSchema = new mongoose.Schema({
  activity: { type: mongoose.Schema.Types.ObjectId, ref: "ActivityBank", required: true },
  activityId: String,
  activityName: String,
  milestone: String,
  type: String,
  status: { type: String, enum: ["Pending", "Started", "Completed", "Need Help"], default: "Pending" },
  order: Number,
  startedAt: Date,
  completedAt: Date
}, { _id: true });

const DailyTaskAssignmentSchema = new mongoose.Schema({
  assignmentDate: { type: String, index: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "AutomationTeacher", required: true },
  teacherId: { type: String, index: true },
  teacherName: String,
  className: { type: String, index: true },
  ageGroup: String,
  level: { type: String, index: true },
  activityCount: Number,
  tasks: [TaskItemSchema],
  status: {
    type: String,
    enum: ["Assigned", "Partially Completed", "Completed", "Reassigned"],
    default: "Assigned",
    index: true
  }
}, { timestamps: true });

DailyTaskAssignmentSchema.index({ assignmentDate: 1, level: 1 }, { unique: true });

export const DailyTaskAssignment = mongoose.models.DailyTaskAssignment || mongoose.model("DailyTaskAssignment", DailyTaskAssignmentSchema);
export default DailyTaskAssignment;
