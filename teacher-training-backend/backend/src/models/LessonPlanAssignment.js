import mongoose from "mongoose";

const lessonPlanAssignmentSchema = new mongoose.Schema(
  {
    lessonPlan: { type: mongoose.Schema.Types.ObjectId, ref: "LessonPlan", required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    center: { type: mongoose.Schema.Types.ObjectId, ref: "Center", index: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", index: true },
    assignedDate: { type: Date, required: true, index: true },
    status: { type: String, enum: ["pending", "completed", "reviewed"], default: "pending" },
  },
  { timestamps: true }
);

export const LessonPlanAssignment = mongoose.model("LessonPlanAssignment", lessonPlanAssignmentSchema);
